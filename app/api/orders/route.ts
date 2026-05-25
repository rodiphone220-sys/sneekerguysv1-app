import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';

const getAuthClient = () => {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
  if (!clientEmail || !privateKey) return null;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (error: any) {
      const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
      if (!isQuotaError || i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
};

const generarIdOrden = (): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ORD-${timestamp}-${randomSuffix}`;
};

const mapOrderToRow = (order: any): any[] => {
  const today = new Date().toISOString().split('T')[0];
  return [
    order.id || generarIdOrden(),           // A: ID_ORDEN
    order.id_cliente || '',                  // B: ID_CLIENTE
    order.nombre || '',                      // C: NOMBRE
    order.telefono || '',                    // D: TELEFONO
    order.email || '',                       // E: EMAIL
    order.direccion || '',                   // F: DIRECCION
    order.ig_handle || '',                   // G: IG_HANDLE
    order.referido_por || '',                // H: REFERIDO_POR
    order.tipo_de_pago || '',                // I: TIPO_DE_PAGO
    order.modelo_seleccionado || '',         // J: MODELO_SELECCIONADO
    order.sku_referencia || '',              // K: SKU_REFERENCIA
    order.talla || '',                       // L: TALLA
    order.cantidad || 1,                     // M: CANTIDAD
    order.precio_unitario || 0,              // N: PRECIO_UNITARIO
    order.total_mxn || 0,                    // O: TOTAL_MXN
    order.notas || '',                       // P: NOTAS
    order.fecha_pedido || today,             // Q: FECHA_PEDIDO
    order.status || 'Pendiente',             // R: STATUS
    order.prioridad || 'Normal',             // S: PRIORIDAD
  ];
};

export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    if (!SHEET_ID) return Response.json({ error: 'GOOGLE_SHEET_ID no definido' }, { status: 500 });

    const body = await request.json();
    if (!body.nombre || !body.modelo_seleccionado) {
      return Response.json({ error: 'Campos "nombre" y "modelo_seleccionado" son requeridos' }, { status: 400 });
    }

    const sheets = google.sheets('v4');
    const row = mapOrderToRow(body);

    const appendResponse = await withRetry(() =>
      sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'ORDERS'!A:A",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      })
    );

    console.log(`[POST ORDERS] ✅ Orden guardada: ${row[0]}`);
    return Response.json({
      success: true,
      message: 'Pedido registrado correctamente',
      id: row[0],
      folio: row[0]
    });

  } catch (error: any) {
    console.error('[POST ORDERS] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    if (!SHEET_ID) return Response.json({ error: 'GOOGLE_SHEET_ID no definido' }, { status: 500 });

    const sheets = google.sheets('v4');
    const response = await withRetry(() =>
      sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'ORDERS'!A2:S"
      })
    );

    const rows = response.data.values || [];
    const orders = rows.map((row: any[], index: number) => ({
      id: row[0] || `o-${index}`,
      id_cliente: row[1] || '',
      nombre: row[2] || '',
      telefono: row[3] || '',
      email: row[4] || '',
      direccion: row[5] || '',
      ig_handle: row[6] || '',
      referido_por: row[7] || '',
      tipo_de_pago: row[8] || '',
      modelo_seleccionado: row[9] || '',
      sku_referencia: row[10] || '',
      talla: row[11] || '',
      cantidad: parseInt(row[12]) || 1,
      precio_unitario: parseFloat(row[13]) || 0,
      total_mxn: parseFloat(row[14]) || 0,
      notas: row[15] || '',
      fecha_pedido: row[16] || '',
      status: row[17] || 'Pendiente',
      prioridad: row[18] || 'Normal',
    }));

    return Response.json(orders);

  } catch (error: any) {
    console.error('[GET ORDERS] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
