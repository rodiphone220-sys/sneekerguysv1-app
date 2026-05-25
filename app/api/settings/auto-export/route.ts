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

export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    if (!SHEET_ID) return Response.json({ error: 'GOOGLE_SHEET_ID no definido' }, { status: 500 });

    const body = await request.json();
    const enabled = body.enabled === true;

    const sheets = google.sheets('v4');

    const getResponse = await withRetry(() =>
      sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'SETTINGS'!A:B"
      })
    );

    const rows = getResponse.data.values || [];
    const keyIndex = rows.findIndex((r: any[]) => r[0]?.trim() === 'auto_export_enabled');

    if (keyIndex >= 0) {
      const rowNum = keyIndex + 1;
      await withRetry(() =>
        sheets.spreadsheets.values.update({
          auth,
          spreadsheetId: SHEET_ID,
          range: `'SETTINGS'!B${rowNum}:B${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[enabled ? 'TRUE' : 'FALSE']] }
        })
      );
    } else {
      await withRetry(() =>
        sheets.spreadsheets.values.append({
          auth,
          spreadsheetId: SHEET_ID,
          range: "'SETTINGS'!A:B",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['auto_export_enabled', enabled ? 'TRUE' : 'FALSE']] }
        })
      );
    }

    return Response.json({ success: true, enabled });

  } catch (error: any) {
    console.error('[POST AUTO-EXPORT] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
