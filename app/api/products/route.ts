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

// =====================================================
// MASTER_DATA - 29 Columnas (A a AC) - ESTRUCTURA CORRECTA
// =====================================================
// A: ID_UNICO | B: FECHA_REGISTRO | C: STATUS_LOGISTICA | D: UBICACION_ACTUAL
// E: TAGS | F: PUBLICAR_VITRINA | G: CLIENTE_NOMBRE | H: CLIENTE_TELEFONO
// I: CLIENTE_EMAIL | J: CIUDAD_ESTADO | K: CLIENTE_INSTAGRAM | L: REFERIDO_POR
// M: OBSERVACIONES | N: CATEGORIA | O: MARCA | P: ARTICULO_MODELO
// Q: TALLA | R: GENERO | S: COLOR | T: LINK_IMAGENES | U: BOUTIQUE_ORIGEN
// V: TARJETA_PAGO | W: ORIGEN_ARTICULO | X: COSTO_USD | Y: TIPO_CAMBIO
// Z: COSTO_MX | AA: PRECIO_DE_COMPRA | AB: PRECIO_SUGERIDO_VENTA | AC: UTILIDAD_BRUTA
// =====================================================

const STATUS_LOGISTICS_MAP: Record<string, string> = {
  'COMPRADO': 'Comprado en USA',
  'EN_RUTA': 'En Ruta a Zafi',
  'EN_BODEGA': 'Recibido en Zafi',
  'ENVIADO': 'Enviado a México',
  'ENTREGADO': 'Entregado',
};

const STATUS_LOGISTICS_REVERSE: Record<string, string> = {
  'Comprado en USA': 'COMPRADO',
  'En Ruta a Zafi': 'EN_RUTA',
  'Recibido en Zafi': 'EN_BODEGA',
  'Enviado a México': 'ENVIADO',
  'Entregado': 'ENTREGADO',
};

function statusCodeToLabel(codeOrLabel: string): string {
  if (STATUS_LOGISTICS_REVERSE[codeOrLabel]) return codeOrLabel;
  return STATUS_LOGISTICS_MAP[codeOrLabel] || codeOrLabel || 'Comprado en USA';
}

const parseSheetNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString().trim().replace(/[$\s]/g, '').replace(/,/g, '').replace(/\((.*)\)/, '-$1')) || 0;
};

// =====================================================
// MAPEO: 29 COLUMNAS - SHEET -> PRODUCT (LECTURA)
// =====================================================
const mapRowToProduct = (row: any[], index: number): any => {
  const rawStatus = row[2] ? String(row[2]).trim() : ''; // C: STATUS_LOGISTICA
  let convertedStatus = STATUS_LOGISTICS_REVERSE[rawStatus] || 'COMPRADO';

  const today = new Date().toISOString().split('T')[0];

  const costoUsd = parseSheetNumber(row[23]) || 0; // X: COSTO_USD
  const tipoCambio = parseSheetNumber(row[24]) || 18; // Y: TIPO_CAMBIO
  const costoMxn = parseSheetNumber(row[25]) || (costoUsd * tipoCambio); // Z: COSTO_MX
  const precioVentaMxn = parseSheetNumber(row[27]) || Math.round(costoMxn * 1.35); // AB: PRECIO_SUGERIDO_VENTA
  const utilidadBruta = precioVentaMxn - costoMxn; // AC: UTILIDAD_BRUTA

  let imageLink = row[19] || ''; // T: LINK_IMAGENES
  console.log('🔍 DEBUG imageLink - row[19]:', JSON.stringify(row[19]), 'tipo:', typeof row[19]);
  if (imageLink.startsWith('data:image')) {
    imageLink = '📷 Imagen cargada desde dispositivo';
  }

  return {
    id: row[0] || `r${index}`,
    originalId: row[0] || '',
    sku: row[0] || '',
    fecha_registro: row[1] || today,
    currentStatus: convertedStatus,
    ubicacion_actual: row[3] || '',
    tags: row[4] ? String(row[4]).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    publicar_vitrina: row[5] === true || row[5] === 'TRUE' || row[5] === 1,
    isShowcase: row[5] === true || row[5] === 'TRUE' || row[5] === 1,
    clientName: row[6] || '',
    clientPhone: row[7] || '',
    clientEmail: row[8] || '',
    ciudad_estado: row[9] || '',
    clientIg: row[10] || '',
    referido_por: row[11] || '',
    notes: row[12] || '',
    category: row[13] || '',
    brand: row[14] || '',
    name: row[15] || '',
    size: row[16] || '',
    gender: row[17] || 'UNISEX',
    color_description: row[18] || '',
    imageUrl: imageLink,
    boutique: row[20] || '',
    payment_card: row[21] || '', // V: TARJETA_PAGO
    origen_articulo: row[22] || 'USA',
    buyPriceUsd: costoUsd,
    exchangeRate: tipoCambio,
    buyPriceMxn: costoMxn,
    sellPriceMxn: precioVentaMxn,
    utilidad_bruta: utilidadBruta,
    createdAt: row[1] || today,
    updatedAt: today,
  };
};

// =====================================================
// MAPEO: 29 COLUMNAS - PRODUCT -> SHEET (ESCRITURA)
// =====================================================
const mapProductToRow = (product: any): any[] => {
  const today = new Date().toISOString().split('T')[0];
  const sku = product.sku_manual || product.sku || product.id || `SKU-${Date.now()}`;

  const STATUS_LOGISTICS_MAP: Record<string, string> = {
    'COMPRADO': 'Comprado en USA',
    'EN_RUTA': 'En Ruta a Zafi',
    'EN_BODEGA': 'Recibido en Zafi',
    'ENVIADO': 'Enviado a México',
    'ENTREGADO': 'Entregado',
  };

  const LOCATION_MAP: Record<string, string> = {
    'COMPRADO': 'Bodega USA',
    'EN_RUTA': 'En tránsito a Zafi',
    'EN_BODEGA': 'Zafi Monterrey - Bodega',
    'ENVIADO': 'En ruta a México',
    'ENTREGADO': 'Entregado a cliente',
  };

  const origenArticulo = product.origen_articulo || product.tipo_compra || 'USA';
  const isNacional = origenArticulo === 'NACIONAL';

  const costoUsd = isNacional ? 0 : (product.buyPriceUsd || 0);
  const tipoCambio = product.exchangeRate || 18;
  let costoMxn = product.buyPriceMxn || 0;

  if (isNacional) {
    costoMxn = product.costo_compra_nacional || product.buyPriceMxn || 0;
  } else {
    costoMxn = (product.buyPriceUsd || 0) * tipoCambio;
  }

  const precioVentaMxn = product.sellPriceMxn || Math.round(costoMxn * 1.35);
  const utilidadBruta = precioVentaMxn - costoMxn;
  const statusLogistico = STATUS_LOGISTICS_MAP[product.currentStatus] || 'Comprado en USA';
  const ubicacionActual = product.ubicacion_actual || LOCATION_MAP[product.currentStatus] || 'Bodega USA';

  let imageLink = product.imageUrl || '';
  if (imageLink.startsWith('data:image')) {
    imageLink = '📷 Imagen cargada desde dispositivo';
  } else if (imageLink.length > 49000) {
    imageLink = imageLink.substring(0, 49000) + '...';
  }

  const publicarVitrina = product.publicar_vitrina !== false && product.isShowcase !== false;

  // ✅ RETORNO DE EXACTAMENTE 29 COLUMNAS (A a AC)
  return [
    sku,                             // [0] A: ID_UNICO
    product.fecha_registro || today, // [1] B: FECHA_REGISTRO
    statusLogistico,                 // [2] C: STATUS_LOGISTICA
    ubicacionActual,                 // [3] D: UBICACION_ACTUAL
    Array.isArray(product.tags) ? product.tags.join(', ') : '', // [4] E: TAGS
    publicarVitrina ? 'TRUE' : 'FALSE', // [5] F: PUBLICAR_VITRINA
    product.clientName || '',        // [6] G: CLIENTE_NOMBRE (SIN 'STOCK')
    product.clientPhone || '',       // [7] H: CLIENTE_TELEFONO
    product.clientEmail || '',       // [8] I: CLIENTE_EMAIL
    product.ciudad_estado || '',     // [9] J: CIUDAD_ESTADO
    product.clientIg || '',          // [10] K: CLIENTE_INSTAGRAM
    product.referido_por || '',      // [11] L: REFERIDO_POR
    product.notes || product.internal_notes || '', // [12] M: OBSERVACIONES
    product.category || '',          // [13] N: CATEGORIA
    product.brand || '',             // [14] O: MARCA
    product.name || '',              // [15] P: ARTICULO_MODELO
    product.size || '',              // [16] Q: TALLA
    product.gender || 'UNISEX',      // [17] R: GENERO
    product.color_description || '', // [18] S: COLOR
    imageLink,                       // [19] T: LINK_IMAGENES
    product.boutique || '',          // [20] U: BOUTIQUE_ORIGEN
    product.payment_card || '',      // [21] V: TARJETA_PAGO ✅
    origenArticulo,                  // [22] W: ORIGEN_ARTICULO
    costoUsd,                        // [23] X: COSTO_USD
    tipoCambio,                      // [24] Y: TIPO_CAMBIO
    costoMxn,                        // [25] Z: COSTO_MX
    costoMxn,                        // [26] AA: PRECIO_DE_COMPRA
    precioVentaMxn,                  // [27] AB: PRECIO_SUGERIDO_VENTA
    utilidadBruta,                   // [28] AC: UTILIDAD_BRUTA
  ];
};

export async function GET() {
  try {
    const auth = getAuthClient();
    if (!auth) {
      console.error('[API GET] ERROR: Auth failed — GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY no configurados en producción');
      return Response.json({ error: 'Credenciales de Google Sheets no configuradas en el servidor', details: 'Configuración incompleta en producción. Verifica GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY.' }, { status: 400 });
    }

    if (!SHEET_ID) {
      console.error('[API GET] ERROR: GOOGLE_SHEET_ID no definido');
      return Response.json({ error: 'GOOGLE_SHEET_ID no definido en el servidor', details: 'Configuración incompleta en producción.' }, { status: 400 });
    }

    const sheets = google.sheets('v4');
    const SHEET_NAME = 'MASTER_DATA';
    console.log(`[API GET] Consultando: ${SHEET_NAME}`);

    // ✅ Leer columnas A a AC (29 columnas)
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SHEET_ID,
      range: `'${SHEET_NAME}'!A2:AC`
    });
    const rows = response.data.values || [];
    console.log(`[API GET] Filas recuperadas: ${rows.length}`);

    const products = rows.map((row: any[], index: number) => mapRowToProduct(row, index));
    return Response.json(products);
  } catch (error: any) {
    console.error('[API GET] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Credenciales de Google Sheets no configuradas en el servidor', details: 'Configuración incompleta en producción.' }, { status: 400 });
    if (!SHEET_ID) return Response.json({ error: 'GOOGLE_SHEET_ID no definido en el servidor', details: 'Configuración incompleta en producción.' }, { status: 400 });

    const body = await request.json();
    const products = Array.isArray(body) ? body : [body];
    const sheets = google.sheets('v4');

    console.log(`[API POST] Guardando ${products.length} producto(s) en MASTER_DATA`);

    const results = [];
    for (const product of products) {
      const sku = product.sku_manual || product.sku || product.id || '';
      if (!sku) {
        product.sku_manual = `SKU-${Date.now()}`;
      }

      const row = mapProductToRow(product);

      // 🔍 VALIDACIÓN: 29 columnas exactas
      if (row.length !== 29) {
        console.error(`[POST] ❌ MISMATCH: ${row.length} vs 29 columnas`);
        return Response.json({ error: `Column count mismatch: ${row.length} vs 29` }, { status: 400 });
      }

      console.log(`[API POST] Guardando - ID: ${row[0]}, Status: ${row[2]}, TARJETA: ${row[21]}`);

      const appendResponse = await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A:A",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
      results.push({ success: true, spreadsheetId: appendResponse.data.spreadsheetId });
    }

    console.log(`[API POST] ✅ Guardados ${results.length} registros`);
    return Response.json({ success: true, count: results.length, results });
  } catch (error: any) {
    console.error('[API POST] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Credenciales de Google Sheets no configuradas en el servidor', details: 'Configuración incompleta en producción.' }, { status: 400 });

    const body = await request.json();
    const { id, ...productData } = body;

    const sheets = google.sheets('v4');
    const getResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SHEET_ID,
      range: "'MASTER_DATA'!A2:AC" // ✅ Rango correcto
    });

    const rows = getResponse.data.values || [];
    let rowIndex = -1;
    let searchId = id;
    if (id && id.includes('-')) {
      searchId = id.split('-')[0];
    }

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === searchId || rows[i][0] === id) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const row = mapProductToRow(productData);

    // 🔍 VALIDACIÓN: 29 columnas exactas
    if (row.length !== 29) {
      console.error(`[PUT] ❌ MISMATCH: ${row.length} vs 29 columnas`);
      return Response.json({ error: `Column count mismatch: ${row.length} vs 29` }, { status: 400 });
    }

    const updateRange = `'MASTER_DATA'!A${rowIndex}:AC${rowIndex}`; // ✅ Rango correcto

    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SHEET_ID,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    console.log(`[PUT] ✅ Actualizado - Fila: ${rowIndex}, ID: ${row[0]}`);
    return Response.json({ success: true, row: rowIndex });
  } catch (error: any) {
    console.error('[PUT] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}