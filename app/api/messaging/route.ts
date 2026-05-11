import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';

let messageCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 10000; // 10 seconds

const LOG_SHEET_NAME = 'LOG_EMAILS';

async function logEmailToSheet(auth: any, data: {
  pedidoNum: string;
  emailCliente: string;
  status: 'ENVIADO' | 'ERROR';
  asunto: string;
  exito: boolean;
  cuentaUsada: string;
}) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${LOG_SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          new Date().toISOString(),      // [0] FECHA
          data.pedidoNum || '',         // [1] PEDIDO_NUM
          data.emailCliente || '',      // [2] EMAIL_CLIENTE
          data.status,                  // [3] STATUS
          data.asunto || '',            // [4] ASUNTO
          data.exito ? 'TRUE' : 'FALSE', // [5] EXITO
          data.cuentaUsada || 'SYSTEM'  // [6] CUENTA_USADA
        ]],
      },
    });
  } catch (logError) {
    console.error('Error logging to LOG_EMAILS:', logError);
  }
}

const getAuthClient = () => {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
  if (!clientEmail || !privateKey) return null;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
};

async function getCustomersMap(auth: any) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'CLIENTES!A:K',
    });
    const rows = response.data.values || [];
    if (rows.length < 2) return {};
    
    const headers = rows[0].map((h: string) => h?.toLowerCase().trim() || '');
    const idCol = headers.findIndex((h: string) => h.includes('id') || h.includes('codigo'));
    const nameCol = headers.findIndex((h: string) => h.includes('nombre') || h.includes('name') || h.includes('cliente'));
    
    if (idCol === -1 || nameCol === -1) return {};
    
    const customersMap: Record<string, string> = {};
    rows.slice(1).forEach((row: any[]) => {
      const id = row[idCol]?.toString()?.trim();
      const name = row[nameCol]?.toString()?.trim();
      if (id && name) {
        customersMap[id] = name;
      }
    });
    return customersMap;
  } catch {
    return {};
  }
}

async function getUsersMap(auth: any) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'USUARIOS!A:I',
    });
    const rows = response.data.values || [];
    if (rows.length < 2) return {};
    
    // Map: ID -> {nombre, rol}
    const usersMap: Record<string, {nombre: string, rol: string}> = {};
    const headers = rows[0].map((h: string) => h?.toLowerCase().trim() || '');
    const idCol = headers.findIndex((h: string) => h.includes('id_usuario') || h.includes('id'));
    const nameCol = headers.findIndex((h: string) => h.includes('nombre'));
    const rolCol = headers.findIndex((h: string) => h.includes('rol'));
    
    rows.slice(1).forEach((row: any[]) => {
      const id = row[idCol]?.toString()?.trim();
      const nombre = row[nameCol]?.toString()?.trim();
      const rol = row[rolCol]?.toString()?.trim();
      if (id && nombre) {
        usersMap[id] = { nombre, rol: rol || 'USUARIO' };
      }
    });
    return usersMap;
  } catch {
    return {};
  }
}

function formatDateForDisplay(fechaStr: string): string {
  try {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return fechaStr;
    return fecha.toLocaleDateString('es-MX', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return fechaStr;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (body.action === 'markRead') {
      try {
        const authClient = getAuthClient();
        if (!authClient) {
          return Response.json({ error: 'Configuración incompleta' }, { status: 500 });
        }
        
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: 'MENSAJERIA!A:H',
        });
        
        const rows = response.data.values || [];
        if (rows.length < 2) return Response.json({ success: true });
        
        const headers = rows[0];
        const leidoColIndex = headers.findIndex((h: string) => h?.toLowerCase().includes('leido'));
        const emisorColIndex = headers.findIndex((h: string) => h?.toLowerCase().includes('emisor'));
        const receptorColIndex = headers.findIndex((h: string) => h?.toLowerCase().includes('receptor'));
        
        if (leidoColIndex === -1 || emisorColIndex === -1 || receptorColIndex === -1) {
          return Response.json({ success: true });
        }
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const emisor = row[emisorColIndex] || '';
          const receptor = row[receptorColIndex] || '';
          const leido = row[leidoColIndex] || '';
          
          if (emisor === body.emisorId && receptor === body.receptorId && leido === 'FALSE') {
            await sheets.spreadsheets.values.update({
              spreadsheetId: SHEET_ID,
              range: `MENSAJERIA!A${i + 1}:H${i + 1}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [[...row.slice(0, leidoColIndex), 'TRUE', ...row.slice(leidoColIndex + 1)]] }
            });
          }
        }
        
        messageCache = null;
        return Response.json({ success: true });
      } catch (markError: any) {
        console.error('Mark read error:', markError?.message);
        return Response.json({ success: true }); // Don't fail on quota
      }
    }
    
    // Send message - invalidate cache
    messageCache = null;
    
    try {
      const authClient = getAuthClient();
      if (!authClient) {
        return Response.json({ error: 'Configuración de Google Sheets incompleta' }, { status: 500 });
      }

      const { emisorId, emisorNombre, receptorId, mensaje, tipo } = body;
      const sheets = google.sheets({ version: 'v4', auth: authClient });

      // Get receptor nombre for display
      let receptorNombre = receptorId;
      try {
        const usersMapTemp = await getUsersMap(authClient);
        if (usersMapTemp[receptorId]) {
          receptorNombre = usersMapTemp[receptorId].nombre;
        } else {
          const customersMapTemp = await getCustomersMap(authClient);
          if (customersMapTemp[receptorId]) {
            receptorNombre = customersMapTemp[receptorId];
          }
        }
      } catch (e) {
        console.log('Error getting receptor name:', e);
      }

      const newId = `MSG-${Date.now()}`;
      const fecha = new Date().toISOString();

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'MENSAJERIA!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            newId,                  // A: ID_MENSAJE
            fecha,                  // B: FECHA
            emisorId || 'SYSTEM',   // C: EMISOR_ID
            emisorNombre || 'Sistema', // D: EMISOR_NOMBRE
            receptorId || '',       // E: RECEPTOR_ID
            receptorNombre,         // F: RECEPTOR_NOMBRE
            mensaje || '',           // G: MENSAJE
            'FALSE',                // H: LEIDO
            tipo || 'internal'      // I: TIPO
          ]],
        },
      });

      await logEmailToSheet(authClient, {
        pedidoNum: newId,
        emailCliente: receptorId,
        status: 'ENVIADO',
        asunto: tipo || 'internal',
        exito: true,
        cuentaUsada: emisorId || 'SYSTEM'
      });

      return Response.json({ success: true, id: newId });
    } catch (sendError: any) {
      console.error('Send message error:', sendError?.message);
      
      const authClient = getAuthClient();
      if (authClient) {
        await logEmailToSheet(authClient, {
          pedidoNum: body.receptorId || 'N/A',
          emailCliente: body.receptorId || '',
          status: 'ERROR',
          asunto: body.tipo || 'internal',
          exito: false,
          cuentaUsada: body.emisorId || 'SYSTEM'
        });
      }
      
      return Response.json({ error: 'Cuota de API excedida. Intenta en unos segundos.' }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Error posting message:', error?.message || error);
    return Response.json({ error: error?.message || 'Error al enviar mensaje' }, { status: 500 });
  }
}

function parseSheetMessages(rows: any[], usersMap: Record<string, {nombre: string, rol: string}>, customersMap: Record<string, string>) {
  if (rows.length < 2) return [];
  
  const headers = rows[0].map((h: string) => h?.toLowerCase().trim() || '');
  
  // Map headers to indices
  const colMap: Record<string, number> = {};
  headers.forEach((h: string, i: number) => {
    colMap[h] = i;
  });
  
  return rows.slice(1).map((row: any[]) => {
    // Safe get with fallback
    const getCol = (key: string) => {
      const idx = colMap[key];
      return idx !== undefined && idx < row.length ? row[idx] : '';
    };
    
    const emisorId = getCol('emisor_id');
    const receptorId = getCol('receptor_id');
    
    // PRIORITY: USUARIOS (internal team) first
    const emisorUser = usersMap[emisorId] || {nombre: '', rol: ''};
    const receptorUser = usersMap[receptorId] || {nombre: '', rol: ''};
    
    return {
      ID_MENSAJE: getCol('id_mensaje') || getCol('id') || '',
      FECHA: getCol('fecha') || '',
      EMISOR_ID: emisorId,
      EMISOR_NOMBRE: emisorUser.nombre || getCol('emisor_nombre') || emisorId,
      EMISOR_ROL: emisorUser.rol || '',
      RECEPTOR_ID: receptorId,
      RECEPTOR_NOMBRE: receptorUser.nombre || getCol('receptor_nombre') || customersMap[receptorId] || receptorId,
      RECEPTOR_ROL: receptorUser.rol || '',
      MENSAJE: getCol('mensaje') || getCol('message') || '',
      LEIDO: getCol('leido') || getCol('leido') || 'FALSE',
      TIPO: getCol('tipo') || getCol('type') || 'internal',
      FECHA_DISPLAY: formatDateForDisplay(getCol('fecha') || '')
    };
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Check cache (skip if force refresh)
    const now = Date.now();
    if (!forceRefresh && messageCache && (now - messageCache.timestamp) < CACHE_DURATION) {
      return Response.json(messageCache.data);
    }

    try {
      const authClient = getAuthClient();
      if (!authClient) {
        return Response.json({ error: 'Configuración de Google Sheets incompleta' }, { status: 500 });
      }

      const sheets = google.sheets({ version: 'v4', auth: authClient });

      const [customersMap, usersMap] = await Promise.all([
        getCustomersMap(authClient),
        getUsersMap(authClient)
      ]);

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'MENSAJERIA!A:I',
      });

      const rows = response.data.values || [];
      if (rows.length < 2) {
        const emptyData: any[] = [];
        messageCache = { data: emptyData, timestamp: now };
        return Response.json(emptyData);
      }

      const headers = rows[0].map((h: string) => h?.toLowerCase().trim() || '');
      
      // More flexible column finding
      const getCol = (keywords: string[]) => {
        return headers.findIndex((h: string) => keywords.some(k => h.includes(k)));
      };
      
      const idCol = getCol(['id', 'mensaje']);
      const fechaCol = getCol(['fecha']);
      const emisorIdCol = getCol(['emisor']);
      const emisorNomCol = getCol(['emisor', 'nombre']);
      const receptorIdCol = getCol(['receptor']);
      const receptorNomCol = getCol(['receptor', 'nombre']);
      const mensajeCol = getCol(['mensaje', 'message', 'texto']);
      const leidoCol = getCol(['leido', 'read']);
      const tipoCol = getCol(['tipo', 'type']);

      const messages = rows.slice(1).map((row: any[]) => {
        const emisorId = row[emisorIdCol] || '';
        const receptorId = row[receptorIdCol] || '';
        
        // Get raw row values
        const rawRow = headers.reduce((acc: Record<string, string>, h: string, i: number) => {
          acc[h] = row[i] || '';
          return acc;
        }, {});
        
        // PRIORITY: USUARIOS (internal team) first, then CLIENTES
        const emisorUser = usersMap[emisorId];
        const receptorUser = usersMap[receptorId];
        
        // Find message - try multiple keys
        const mensaje = 
          rawRow['mensaje'] || 
          rawRow['mensaje_text'] || 
          rawRow['message'] || 
          row[mensajeCol] || '';
        
        return {
          ID_MENSAJE: row[idCol] || '',
          FECHA: row[fechaCol] || '',
          EMISOR_ID: emisorId,
          EMISOR_NOMBRE: emisorUser?.nombre || row[emisorNomCol] || emisorId,
          EMISOR_ROL: emisorUser?.rol || '',
          RECEPTOR_ID: receptorId,
          RECEPTOR_NOMBRE: receptorUser?.nombre || row[receptorNomCol] || customersMap[receptorId] || receptorId,
          RECEPTOR_ROL: receptorUser?.rol || '',
          MENSAJE: mensaje,
          LEIDO: row[leidoCol] || 'FALSE',
          TIPO: row[tipoCol] || 'internal',
          FECHA_DISPLAY: formatDateForDisplay(row[fechaCol] || '')
        };
      });

      // Update cache
      messageCache = { data: messages, timestamp: now };

      return Response.json(messages);
    } catch (sheetsError: any) {
      console.error('Google Sheets error:', sheetsError?.message);
      // Return cached data if available, otherwise return empty
      if (messageCache) {
        return Response.json(messageCache.data);
      }
      return Response.json({ error: 'Actualizando...', recovering: true }, { status: 503 });
    }
  } catch (error) {
    console.error('Error getting messages:', error);
    return Response.json({ error: 'Error al obtener mensajes' }, { status: 500 });
  }
}