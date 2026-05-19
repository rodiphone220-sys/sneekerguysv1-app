/**
 * 📦 TSG API - CLIENTES Sync
 * 🔹 Función: CRUD completo para hoja CLIENTES
 * 🔹 Estructura: 19 columnas exactas (A a S)
 * 🔹 Archivo: app/api/clientes/route.ts
 * 🔹 Versión: v2.0 | 2026-05-19
 */

import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';

// =====================================================
// AUTENTICACIÓN
// =====================================================
const getAuthClient = () => {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();

  if (!clientEmail || !privateKey) return null;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
};

// =====================================================
// UTILIDADES
// =====================================================
const parseSheetNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString().trim().replace(/[$\s]/g, '').replace(/,/g, '').replace(/\((.*)\)/, '-$1')) || 0;
};

const generarIdCliente = (): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `CUST-${timestamp}-${randomSuffix}`;
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

// =====================================================
// MAPEO: GOOGLE SHEETS (19 COLUMNAS) -> FRONTEND
// =====================================================
const mapRowToCustomer = (row: any[], index: number): any => {
  return {
    // Identificación
    id: row[0] || `c-${index}`,           // A: ID_CLIENTE
    id_cliente: row[0] || '',
    fecha_registro: row[1] || '',          // B: FECHA_REGISTRO

    // Datos personales
    nombre_completo: row[2] || '',         // C: NOMBRE_COMPLETO
    nombre: row[2] || '',                  // Alias
    whatsapp: row[3] || '',                // D: WHATSAPP
    telefono: row[3] || '',                // Alias
    email: row[4] || '',                   // E: EMAIL
    ciudad_estado: row[5] || '',           // F: CIUDAD_ESTADO
    address: row[5] || '',                 // Alias

    // Referencias y redes
    referido_por: row[6] || '',            // G: REFERIDO_POR
    redes_sociales: row[18] || '',         // S: REDES_SOCIALES (Instagram)
    ig_handle: row[18] || '',              // Alias

    // Métricas
    total_compras: parseSheetNumber(row[7]) || 0,    // H: TOTAL_COMPRAS
    total_pedidos: parseSheetNumber(row[9]) || 0,    // J: TOTAL_PEDIDOS
    total_comprado: parseSheetNumber(row[10]) || 0,  // K: TOTAL_COMPRADO

    // Notas (2 campos)
    notas_generales: row[8] || '',         // I: NOTAS (1ra)
    notas_adicionales: row[11] || '',      // L: NOTAS (2da)
    notas: row[8] || row[11] || '',        // Alias unificado

    // Configuración
    tipo_de_pago: row[12] || '',           // M: TIPO_DE_PAGO
    prioridad: row[13] || 'NORMAL',        // N: PRIORIDAD
    status: row[14] || 'NUEVO',            // O: STATUS

    // Preferencias
    modelo_preferido: row[15] || '',       // P: MODELO
    talla_preferida: row[16] || '',        // Q: TALLA
    cantidad_default: parseSheetNumber(row[17]) || 1, // R: CANTIDAD

    // Metadata
    createdAt: row[1] || new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };
};

// =====================================================
// MAPEO: FRONTEND -> GOOGLE SHEETS (19 COLUMNAS)
// =====================================================
const mapCustomerToRow = (customer: any): any[] => {
  const today = new Date().toISOString().split('T')[0];

  return [
    // [0] A: ID_CLIENTE
    customer.id || customer.id_cliente || generarIdCliente(),

    // [1] B: FECHA_REGISTRO
    customer.fecha_registro || customer.fecha_alta || today,

    // [2] C: NOMBRE_COMPLETO
    customer.nombre_completo || customer.nombre || customer.name || '',

    // [3] D: WHATSAPP
    customer.whatsapp || customer.telefono || customer.phone || '',

    // [4] E: EMAIL
    customer.email || '',

    // [5] F: CIUDAD_ESTADO
    customer.ciudad_estado || customer.address || customer.ciudad || '',

    // [6] G: REFERIDO_POR
    customer.referido_por || customer.referido || '',

    // [7] H: TOTAL_COMPRAS
    parseSheetNumber(customer.total_compras) || 0,

    // [8] I: NOTAS (1ra)
    customer.notas_generales || customer.notas || '',

    // [9] J: TOTAL_PEDIDOS
    parseSheetNumber(customer.total_pedidos) || 0,

    // [10] K: TOTAL_COMPRADO
    parseSheetNumber(customer.total_comprado) || 0,

    // [11] L: NOTAS (2da)
    customer.notas_adicionales || customer.notas2 || '',

    // [12] M: TIPO_DE_PAGO
    customer.tipo_de_pago || customer.metodo_pago || 'Transferencia',

    // [13] N: PRIORIDAD
    customer.prioridad || 'NORMAL',

    // [14] O: STATUS
    customer.status || 'NUEVO',

    // [15] P: MODELO
    customer.modelo_preferido || customer.modelo || '',

    // [16] Q: TALLA
    customer.talla_preferida || customer.talla || '',

    // [17] R: CANTIDAD
    parseSheetNumber(customer.cantidad_default) || 1,

    // [18] S: REDES_SOCIALES
    customer.redes_sociales || customer.ig_handle || customer.instagram || '',
  ];
};

// =====================================================
// GET - LECTURA DE CLIENTES (19 COLUMNAS)
// =====================================================
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
        range: "'CLIENTES'!A2:S" // ✅ 19 columnas (A a S)
      })
    );

    const rows = response.data.values || [];
    const customers = rows.map((row: any[], index: number) => mapRowToCustomer(row, index));

    return Response.json(customers);

  } catch (error: any) {
    console.error('[GET CLIENTES] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// POST - ALTA DE CLIENTE (19 COLUMNAS)
// =====================================================
export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    if (!SHEET_ID) return Response.json({ error: 'GOOGLE_SHEET_ID no definido' }, { status: 500 });

    const body = await request.json();

    if (!body.nombre_completo && !body.nombre) {
      return Response.json({ error: 'Campo "nombre" es requerido' }, { status: 400 });
    }

    const sheets = google.sheets('v4');
    const row = mapCustomerToRow(body);

    // 🔍 VALIDACIÓN: 19 columnas exactas
    if (row.length !== 19) {
      console.error(`[POST CLIENTES] ❌ MISMATCH: ${row.length} vs 19 columnas`);
      return Response.json({
        error: `Column count mismatch: ${row.length} vs 19`,
        debug: { received: row.length, expected: 19 }
      }, { status: 400 });
    }

    const appendResponse = await withRetry(() =>
      sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'CLIENTES'!A:A",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      })
    );

    console.log(`[POST CLIENTES] ✅ Guardado: ${row[0]}`);
    return Response.json({
      success: true,
      message: 'Cliente guardado correctamente',
      id: row[0],
      folio: row[0]
    });

  } catch (error: any) {
    console.error('[POST CLIENTES] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// PUT - ACTUALIZACIÓN DE CLIENTE (19 COLUMNAS)
// =====================================================
export async function PUT(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });

    const body = await request.json();
    const { id, id_cliente, ...customerData } = body;

    const searchId = id || id_cliente;
    if (!searchId) {
      return Response.json({ error: 'Client ID required' }, { status: 400 });
    }

    const sheets = google.sheets('v4');

    // Buscar fila por ID
    const getResponse = await withRetry(() =>
      sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'CLIENTES'!A2:A"
      })
    );

    const idColumn = getResponse.data.values || [];
    let rowIndex = -1;

    for (let i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0]?.toString()?.trim() === searchId) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) {
      return Response.json({ error: 'Client not found', searchedId: searchId }, { status: 404 });
    }

    const row = mapCustomerToRow({ ...customerData, id: searchId });

    if (row.length !== 19) {
      return Response.json({ error: `Column mismatch: ${row.length} vs 19` }, { status: 400 });
    }

    await withRetry(() =>
      sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: SHEET_ID,
        range: `'CLIENTES'!A${rowIndex}:S${rowIndex}`, // ✅ A a S
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      })
    );

    console.log(`[PUT CLIENTES] ✅ Actualizado: ${row[0]}`);
    return Response.json({ success: true, rowIndex, folio: row[0] });

  } catch (error: any) {
    console.error('[PUT CLIENTES] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// DELETE - ELIMINACIÓN LÓGICA
// =====================================================
export async function DELETE(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return Response.json({ error: 'Client ID required' }, { status: 400 });
    }

    const sheets = google.sheets('v4');

    const getResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SHEET_ID,
      range: "'CLIENTES'!A2:A"
    });

    const idColumn = getResponse.data.values || [];
    let rowIndex = -1;

    for (let i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0]?.toString()?.trim() === clientId) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Marcado como INACTIVO
    const clearRow = Array(19).fill('');
    clearRow[0] = clientId;
    clearRow[14] = 'INACTIVO'; // O: STATUS

    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SHEET_ID,
      range: `'CLIENTES'!A${rowIndex}:S${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [clearRow] }
    });

    console.log(`[DELETE CLIENTES] ✅ Inactivado: ${clientId}`);
    return Response.json({ success: true, folio: clientId, action: 'logical_delete' });

  } catch (error: any) {
    console.error('[DELETE CLIENTES] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}