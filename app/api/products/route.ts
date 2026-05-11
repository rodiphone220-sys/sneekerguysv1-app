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

const parseSheetNumber = (val: any) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString().trim().replace(/[$\s]/g, '').replace(/,/g, '').replace(/\((.*)\)/, '-$1')) || 0;
};

// =====================================================
// MAPEO EXACTO DE 38 COLUMNAS (A a AL) - ÍNDICES FIJOS
// =====================================================
// Índice = Letra - 1 (A=0, B=1, ..., AL=37)
const mapProductToRow = (product: any): any[] => {
  const today = new Date().toISOString().split('T')[0];
  const sku = product.sku_manual || product.sku || product.id || '';
  
  // Determinar tipo de compra
  const tipoCompra = (product.tipo_compra || product.origen_articulo || 'USA').toUpperCase();
  const isNacional = tipoCompra === 'NACIONAL';
  
  // COSTO_USD: 0 si es nacional
  const costoUsd = isNacional ? 0 : (product.buyPriceUsd || 0);
  
  // COSTO_MXN (Col S = índice 18)
  const costoMxn = product.buyPriceMxn || 0;
  
  // PRECIO_VENTA_MXN (Col T = índice 19)
  const precioVentaMxn = product.sellPriceMxn || 0;
  
  // UTILIDAD_BRUTA (Col U = índice 20) = Precio Venta - Costo MXN
  const utilidadBruta = precioVentaMxn - costoMxn;
  
  // Manejar imageUrl
  let imageLink = product.imageUrl || '';
  if (imageLink.startsWith('data:image')) {
    imageLink = '📷 Imagen cargada desde dispositivo';
  } else if (imageLink.includes('drive.google.com')) {
    // URL de Drive - mantener
  } else if (imageLink.length > 49000) {
    imageLink = imageLink.substring(0, 49000) + '...';
  }

  // Array exacto de 38 posiciones (0-37)
  return [
    sku,                          // [0] A: ID_UNICO
    today,                        // [1] B: FECHA_REGISTRO
    sku,                          // [2] C: NUMERO_PEDIDO
    product.clientName || 'STOCK', // [3] D: CLIENTE_NOMBRE
    product.clientEmail || '',    // [4] E: CLIENTE_EMAIL
    product.clientPhone || '',     // [5] F: CLIENTE_TELEFONO
    product.referido_por || '',   // [6] G: REFERIDO_POR
    product.metodo_pago_cliente || '', // [7] H: METODO_PAGO_CLIENTE
    product.name || '',            // [8] I: ARTICULO_MODELO
    product.category || '',        // [9] J: CATEGORIA
    product.boutique || '',       // [10] K: BOUTIQUE_ORIGEN
    imageLink,                     // [11] L: LINK_IMAGENES
    product.origen_articulo || '', // [12] M: ORIGEN_ARTICULO
    costoUsd,                     // [13] N: COSTO_USD (para compatibilidad legacy)
    product.exchangeRate || 18,   // [14] O: TIPO_CAMBIO
    tipoCompra,                   // [15] P: TIPO_COMPRA ('NACIONAL' o 'USA')
    costoUsd,                     // [16] Q: COSTO_USD (0 si es nacional)
    '',                           // [17] R: (reservado)
    costoMxn,                     // [18] S: COSTO_MXN
    precioVentaMxn,               // [19] T: PRECIO_VENTA_MXN
    utilidadBruta,                // [20] U: UTILIDAD_BRUTA
    product.currentStatus || '',  // [21] V: STATUS_LOGISTICA
    product.clientAddress || '',  // [22] W: UBICACION_DESTINO
    '',                           // [23] X: (reservado)
    '',                           // [24] Y: (reservado)
    '',                           // [25] Z: (reservado)
    '',                           // [26] AA: (reservado)
    '',                           // [27] AB: (reservado)
    '',                           // [28] AC: (reservado)
    '',                           // [29] AD: (reservado)
    '',                           // [30] AE: (reservado)
    '',                           // [31] AF: (reservado)
    '',                           // [32] AG: (reservado)
    product.internal_notes || '', // [33] AH: OBSERVACIONES
    product.payment_card || '',   // [34] AI: TARJETA_PAGO
    '',                           // [35] AJ: (reservado)
    '',                           // [36] AK: (reservado)
    product.tags?.join(', ') || '', // [37] AL: TAGS
  ];
};

// =====================================================
// LECTURA: MAPEO INVERSO DESDE SHEET (38 COLUMNAS)
// =====================================================
const mapRowToProduct = (row: any[], index: number): any => ({
  // Campos esenciales para Dashboard y Stock Maestro
  id: `${row[0] || `r${index}`}-${index}`,
  originalId: row[0] || '',
  sku: row[0] || '',                    // [0] A: ID_UNICO
  name: row[8] || '',                  // [8] I: ARTICULO_MODELO
  brand: row[40] || '',               // [40] AO: MARCA
  category: row[9] || '',             // [9] J: CATEGORIA
  currentStatus: row[21] || 'Comprado en USA', // [21] V: STATUS_LOGISTICA
  quantity: 1,                         // Por defecto 1
  minStock: 1,                        // Por defecto 1
  
  // Campos actualizados según mapeo de 38 columnas
  fecha_registro: row[1] || '',         // [1] B: FECHA_REGISTRO
  numero_pedido: row[2] || '',         // [2] C: NUMERO_PEDIDO
  clientName: row[3] || '',            // [3] D: CLIENTE_NOMBRE
  clientEmail: row[4] || '',           // [4] E: CLIENTE_EMAIL
  clientPhone: row[5] || '',           // [5] F: CLIENTE_TELEFONO
  referenciado_por: row[6] || '',      // [6] G: REFERIDO_POR
  metodo_pago_cliente: row[7] || '',   // [7] H: METODO_PAGO_CLIENTE
  boutique: row[10] || '',            // [10] K: BOUTIQUE_ORIGEN
  imageUrl: row[11] || '',            // [11] L: LINK_IMAGENES
  origen_articulo: row[12] || '',      // [12] M: ORIGEN_ARTICULO
  buyPriceUsd: parseSheetNumber(row[13]) || parseSheetNumber(row[16]) || 0, // [13] N o [16] Q: COSTO_USD
  exchangeRate: parseSheetNumber(row[14]) || 18, // [14] O: TIPO_CAMBIO
  tipo_compra: row[15] || 'USA',       // [15] P: TIPO_COMPRA
  costo_mxn: parseSheetNumber(row[18]), // [18] S: COSTO_MXN
  sellPriceMxn: parseSheetNumber(row[19]), // [19] T: PRECIO_VENTA_MXN
  utilidad_bruta: parseSheetNumber(row[20]), // [20] U: UTILIDAD_BRUTA
  clientAddress: row[22] || '',       // [22] W: UBICACION_DESTINO
  notes: row[33] || '',               // [33] AH: OBSERVACIONES
  payment_card: row[34] || '',        // [34] AI: TARJETA_PAGO
  buyPriceMxn: parseSheetNumber(row[18]), // Costo MXN para compatibilidad
  size: row[41] || '',                // [41] AP: TALLA
  color_description: row[42] || '',   // [42] AQ: COLOR
  gender: row[43] || '',              // [43] AR: GENERO
  tags: row[37] ? row[37].split(',').map((t: string) => t.trim()).filter(Boolean) : [], // [37] AL: TAGS
});

export async function GET() {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    const sheets = google.sheets('v4');
    const response = await sheets.spreadsheets.values.get({ auth, spreadsheetId: SHEET_ID, range: "'MASTER_DATA'!A2:AL" });
    const rows = response.data.values || [];
    const products = rows.map((row: any[], index: number) => mapRowToProduct(row, index));
    return Response.json(products);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    
    const body = await request.json();
    const products = Array.isArray(body) ? body : [body];
    const sheets = google.sheets('v4');
    
    const results = [];
    for (const product of products) {
      const row = mapProductToRow(product);
      const appendResponse = await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A:A",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
      results.push({ success: true, spreadsheetId: appendResponse.data.spreadsheetId });
    }
    
    return Response.json({ success: true, count: results.length, results });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    
    const body = await request.json();
    const { id, ...productData } = body;
    
    // Get current data to find row
    const sheets = google.sheets('v4');
    const getResponse = await sheets.spreadsheets.values.get({ 
      auth, 
      spreadsheetId: SHEET_ID, 
      range: "'MASTER_DATA'!A2:AL" 
    });
    
    const rows = getResponse.data.values || [];
    let rowIndex = -1;
    let originalId = id;
    
    // Find row by ID
    if (id && id.includes('-')) {
      originalId = id.split('-')[0];
    }
    
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === originalId || rows[i][0] === id) {
        rowIndex = i + 2; // +2 because row 1 is header, data starts at row 2
        break;
      }
    }
    
    if (rowIndex === -1) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const row = mapProductToRow(productData);
    const updateRange = `'MASTER_DATA'!A${rowIndex}:AL`;
    
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SHEET_ID,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });
    
    return Response.json({ success: true, row: rowIndex });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}