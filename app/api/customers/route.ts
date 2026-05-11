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

export async function GET() {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    const sheets = google.sheets('v4');
    const response = await sheets.spreadsheets.values.get({ auth, spreadsheetId: SHEET_ID, range: "'CLIENTES'!A2:R" });
    const rows = response.data.values || [];
    const customers = rows.map((row: any[], index: number) => ({
      id: row[0] || `c-${index}`,
      name: row[1] || '',
      phone: row[3] || '',
      email: row[4] || '',
      address: row[5] || '',
      referido_por: row[6] || '',
      notes: row[8] || '',
      total_pedidos: row[9] ? parseInt(row[9]) : 0,
      total_comprado: row[10] ? parseFloat(row[10]) : 0,
      tipo_de_pago: row[12] || '',
      status: row[14] || 'NUEVO'
    }));
    return Response.json(customers);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });

    const body = await request.json();
    const { id_cliente, nombre, telefono, email, direccion, ig_handle, referido_por, notas, tipo_de_pago } = body;

    const sheets = google.sheets('v4');
    const fecha = new Date().toISOString().split('T')[0];

    // Mapeo completo de columnas A a R
    const values = [[
      id_cliente || `CUST-${Date.now()}`,        // A: ID_CLIENTE
      fecha,                                      // B: FECHA_REGISTRO
      nombre || '',                               // C: NOMBRE_COMPLETO
      telefono || '',                             // D: WHATSAPP
      email || '',                                // E: EMAIL
      direccion || '',                           // F: CIUDAD_ESTADO
      referido_por || '',                         // G: REFERIDO_POR
      '',                                         // H: TOTAL_COMPRAS
      notas || '',                                // I: NOTAS
      0,                                          // J: TOTAL_PEDIDOS
      0,                                          // K: TOTAL_COMPRADO
      '',                                         // L: NOTAS_ADICIONALES
      tipo_de_pago || '',                         // M: TIPO_DE_PAGO
      '',                                         // N: PRIORIDAD
      'NUEVO',                                    // O: STATUS
      '',                                         // P: MODELO
      '',                                         // Q: TALLA
      ''                                          // R: CANTIDAD
    ]];

    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SHEET_ID,
      range: "'CLIENTES'!A2",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    return Response.json({ success: true, message: 'Cliente guardado correctamente' });
  } catch (error: any) {
    console.error('Error saving customer:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}