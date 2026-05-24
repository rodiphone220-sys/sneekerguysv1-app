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

const SHEET_NAME = 'PERSONAL_EXPENSES';

const VALID_CATEGORIES = ['Comida', 'Transporte', 'Ropa', 'Salud', 'Ocio', 'Servicios', 'Viajes', 'Otros'] as const;
const VALID_CARDS = ['AMEX AZUL', 'AMEX ALEX', 'SANTANDER', 'INVEX', 'NU', 'EFECTIVO'] as const;

const ensureSheetExists = async (sheets: any, auth: any) => {
  try {
    const res = await sheets.spreadsheets.get({ auth, spreadsheetId: SHEET_ID });
    const existingSheets = res.data.sheets?.map((s: any) => s.properties?.title) || [];
    if (!existingSheets.includes(SHEET_NAME)) {
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: SHEET_NAME, gridProperties: { frozenRowCount: 1 } },
            },
          }],
        },
      });
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: SHEET_ID,
        range: `'${SHEET_NAME}'!A1:G1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['ID', 'FECHA', 'MONTO', 'CONCEPTO', 'CATEGORIA', 'TARJETA_PAGO', 'CREATED_AT']],
        },
      });
    }
  } catch (e) {
    console.error('[PERSONAL_EXPENSES] Error ensuring sheet exists:', e);
  }
};

const parseDDMMYYYY = (dateStr: string): string => {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const formatToDDMMYYYY = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTimestamp = (dateStr: string): string => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const mapRowToExpense = (row: any[], index: number): any => {
  return {
    id: row[0] || `exp-${index}`,
    fecha: parseDDMMYYYY(row[1]) || new Date().toISOString().split('T')[0],
    monto: parseFloat(String(row[2]).replace(/[^0-9.-]/g, '')) || 0,
    concepto: row[3] || '',
    categoria: row[4] || 'Otros',
    tarjeta_pago: row[5] || '',
    created_at: row[6] || '',
  };
};

const mapExpenseToRow = (expense: any): any[] => {
  const now = new Date();
  return [
    expense.id || `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    formatToDDMMYYYY(expense.fecha),
    expense.monto || 0,
    expense.concepto || '',
    expense.categoria || 'Otros',
    expense.tarjeta_pago || '',
    formatTimestamp(expense.created_at || now.toISOString()),
  ];
};

export async function GET(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    if (!SHEET_ID) return Response.json({ error: 'GOOGLE_SHEET_ID no definido' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const monthFilter = searchParams.get('month');

    const sheets = google.sheets('v4');
    await ensureSheetExists(sheets, auth);

    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SHEET_ID,
      range: `'${SHEET_NAME}'!A2:G`,
    });

    const rows = response.data.values || [];
    const expenses = rows.map((row: any[], index: number) => mapRowToExpense(row, index));

    if (monthFilter) {
      const filtered = expenses.filter((e: any) => e.fecha.startsWith(monthFilter));
      const totalMonto = filtered.reduce((acc: number, e: any) => acc + e.monto, 0);
      return Response.json({ month: monthFilter, total: totalMonto, count: filtered.length });
    }

    return Response.json(expenses);
  } catch (error: any) {
    console.error('[PERSONAL_EXPENSES GET] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    if (!SHEET_ID) return Response.json({ error: 'GOOGLE_SHEET_ID no definido' }, { status: 500 });

    const body = await request.json();
    const sheets = google.sheets('v4');
    await ensureSheetExists(sheets, auth);

    const montoNum = Number(String(body.monto).replace(/[^0-9.\-]/g, ''));
    if (!body.monto || isNaN(montoNum) || montoNum <= 0) {
      return Response.json({ error: 'El campo monto es obligatorio y debe ser un número válido mayor a 0' }, { status: 400 });
    }
    if (!body.concepto?.trim()) {
      return Response.json({ error: 'El campo concepto es obligatorio' }, { status: 400 });
    }
    if (!body.categoria || !VALID_CATEGORIES.includes(body.categoria as any)) {
      return Response.json({ error: 'Categoría no válida' }, { status: 400 });
    }
    if (!body.tarjeta_pago || !VALID_CARDS.includes(body.tarjeta_pago as any)) {
      return Response.json({ error: 'Tarjeta de pago no válida' }, { status: 400 });
    }

    const now = new Date();
    const expense = {
      id: body.id || `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      fecha: body.fecha || now.toISOString().split('T')[0],
      monto: montoNum,
      concepto: body.concepto.trim(),
      categoria: body.categoria,
      tarjeta_pago: body.tarjeta_pago,
      created_at: formatTimestamp(now.toISOString()),
    };

    const row = mapExpenseToRow(expense);

    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SHEET_ID,
      range: `'${SHEET_NAME}'!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    return Response.json({ success: true, expense }, { status: 201 });
  } catch (error: any) {
    console.error('[PERSONAL_EXPENSES POST] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
