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

const generarIdMovimiento = (): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `MOV-${timestamp}-${randomSuffix}`;
};

const mapToRow = (data: any): any[] => {
  const today = new Date().toISOString().split('T')[0];
  return [
    data.id_movimiento || generarIdMovimiento(),  // A: ID_MOVIMIENTO
    data.sku || data.id_stock || '',               // B: ID_STOCK
    data.fecha_compra_usa || today,                // C: COMPRADO_USA_FECHA
    data.fecha_compra_mx || '',                    // D: COMPRADO_MX_FECHA
    data.notas_compra || data.notes || '',          // E: NOTAS_COMPRA
    '', '', '', '', '', '', '', '',                  // F-L: status fechas y notas (se llenan con pipeline)
    data.evidencia_link || data.imageUrl || '',     // M: EVIDENCIA_LINK
    data.numero_guia || '',                         // N: NUMERO_GUIA
  ];
};

export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) {
      return Response.json({ error: 'Credenciales de Google Sheets no configuradas en el servidor', details: 'Configuración incompleta en producción.' }, { status: 400 });
    }

    const body = await request.json();
    const sheets = google.sheets('v4');
    const row = mapToRow(body);

    await withRetry(() =>
      sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'INVENTARIO_ESTÁTICO'!A:A",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      })
    );

    console.log(`[POST INVENTARIO] ✅ Registro guardado: ${row[0]}`);
    return Response.json({ success: true, id: row[0], folio: row[0] });

  } catch (error: any) {
    console.error('[POST INVENTARIO] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
