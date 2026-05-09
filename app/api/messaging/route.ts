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

export async function POST(req: Request) {
  try {
    const authClient = getAuthClient();
    if (!authClient) {
      return Response.json({ error: 'Configuración de Google Sheets incompleta' }, { status: 500 });
    }

    const { emisorId, emisorNombre, receptorId, mensaje, tipo } = await req.json();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const newId = `MSG-${Date.now()}`;
    const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'MENSAJERIA!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          newId,
          fecha,
          emisorId,
          emisorNombre,
          receptorId,
          mensaje,
          'FALSE',
          tipo || 'internal'
        ]],
      },
    });

    return Response.json({ success: true, id: newId });
  } catch (error) {
    console.error('Error posting message:', error);
    return Response.json({ error: 'Error al enviar mensaje' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const authClient = getAuthClient();
    if (!authClient) {
      return Response.json({ error: 'Configuración de Google Sheets incompleta' }, { status: 500 });
    }

    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'MENSAJERIA!A:H',
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return Response.json([]);
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row: any[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((header: string, i: number) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    return Response.json(data);
  } catch (error) {
    console.error('Error getting messages:', error);
    return Response.json({ error: 'Error al obtener mensajes' }, { status: 500 });
  }
}