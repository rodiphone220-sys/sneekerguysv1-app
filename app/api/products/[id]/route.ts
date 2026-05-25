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

const parseSheetNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString().trim().replace(/[$\s]/g, '').replace(/,/g, '').replace(/\((.*)\)/, '-$1')) || 0;
};

// =====================================================
// MASTER_DATA - 29 Columnas (A a AC) - ESTRUCTURA CORRECTA
// =====================================================
const mapProductToRow = (product: any): any[] => {
  const today = new Date().toISOString().split('T')[0];
  const sku = product.sku_manual || product.sku || product.id || `SKU-${Date.now()}`;

  // STATUS_LOGISTICS_MAP
  const STATUS_LOGISTICS_MAP: Record<string, string> = {
  'COMPRADO': 'Comprado en USA',
  'COMPRADO_MX': 'Comprado en México',
  'EN_RUTA': 'En Ruta a Zafi',
  'EN_BODEGA': 'Recibido en Zafi',
  'ENVIADO': 'Enviado a México',
  'ENTREGADO': 'Entregado',
  };

  // UBICACION_ACTUAL automática según status
  const LOCATION_MAP: Record<string, string> = {
    'COMPRADO': 'Bodega USA',
    'EN_RUTA': 'En tránsito a Zafi',
    'EN_BODEGA': 'Zafi Monterrey - Bodega',
    'ENVIADO': 'En ruta a México',
    'ENTREGADO': 'Entregado a cliente',
  };

  // Determinar origen y moneda
  const origenArticulo = product.origen_articulo || product.tipo_compra || 'USA';
  const isNacional = origenArticulo === 'NACIONAL';

  // COSTO_USD: 0 si es nacional
  const costoUsd = isNacional ? 0 : (product.buyPriceUsd || 0);

  // COSTO_MXN
  const tipoCambio = product.exchangeRate || 18;
  let costoMxn = product.buyPriceMxn || 0;

  if (isNacional) {
    costoMxn = product.costo_compra_nacional || product.buyPriceMxn || 0;
  } else {
    costoMxn = (product.buyPriceUsd || 0) * tipoCambio;
  }

  // PRECIO_VENTA_MXN
  const precioVentaMxn = product.sellPriceMxn || Math.round(costoMxn * 1.35);

  // UTILIDAD_BRUTA
  const utilidadBruta = precioVentaMxn - costoMxn;

  // Status
  const statusLogistico = STATUS_LOGISTICS_MAP[product.currentStatus] || product.currentStatus || 'Comprado en USA';

  // Ubicación automática
  const ubicacionActual = product.ubicacion_actual || LOCATION_MAP[product.currentStatus] || 'Bodega USA';

  // Manejar imageUrl
  let imageLink = product.imageUrl || '';
  if (imageLink.startsWith('data:image')) {
    imageLink = '📷 Imagen cargada desde dispositivo';
  } else if (imageLink.length > 49000) {
    imageLink = imageLink.substring(0, 49000) + '...';
  }

  // PUBLICAR_VITRINA
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Credenciales de Google Sheets no configuradas en el servidor', details: 'Configuración incompleta en producción.' }, { status: 400 });

    const body = await request.json();
    const id = params.id;

    const sheets = google.sheets('v4');
    const getResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SHEET_ID,
      range: "'MASTER_DATA'!A2:AC" // ✅ RANGO CORRECTO: 29 columnas
    });

    const rows = getResponse.data.values || [];
    let rowIndex = -1;

    // Build a list of candidate IDs to try
    const candidates = [id];
    let stripped = id.replace(/-\d+$/, '');
    if (stripped !== id) candidates.push(stripped);
    if (stripped !== id.replace(/-\d+-\d+$/, '')) {
      const doubleStripped = id.replace(/-\d+-\d+$/, '');
      if (doubleStripped !== id && doubleStripped !== stripped) candidates.push(doubleStripped);
    }

    for (const candidate of candidates) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === candidate) {
          rowIndex = i + 2;
          break;
        }
      }
      if (rowIndex !== -1) break;
    }

    if (rowIndex === -1) {
      return Response.json({ error: 'Product not found', searchedId: id, candidates }, { status: 404 });
    }

    const row = mapProductToRow(body);

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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Credenciales de Google Sheets no configuradas en el servidor', details: 'Configuración incompleta en producción.' }, { status: 400 });

    const id = params.id;
    const sheets = google.sheets('v4');

    const getResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SHEET_ID,
      range: "'MASTER_DATA'!A2:AC"
    });

    const rows = getResponse.data.values || [];
    let rowIndex = -1;

    const candidates = [id];
    let stripped = id.replace(/-\d+$/, '');
    if (stripped !== id) candidates.push(stripped);
    if (stripped !== id.replace(/-\d+-\d+$/, '')) {
      const doubleStripped = id.replace(/-\d+-\d+$/, '');
      if (doubleStripped !== id && doubleStripped !== stripped) candidates.push(doubleStripped);
    }

    for (const candidate of candidates) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === candidate) {
          rowIndex = i + 2;
          break;
        }
      }
      if (rowIndex !== -1) break;
    }

    if (rowIndex === -1) {
      return Response.json({ error: 'Product not found', searchedId: id }, { status: 404 });
    }

    // Logical delete: clear row, keep ID and mark status as INACTIVO
    const emptyRow = Array(29).fill('');
    emptyRow[0] = id;
    emptyRow[2] = 'INACTIVO';

    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SHEET_ID,
      range: `'MASTER_DATA'!A${rowIndex}:AC${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [emptyRow] }
    });

    console.log(`[DELETE] ✅ Eliminado lógico - Fila: ${rowIndex}, ID: ${id}`);
    return Response.json({ success: true, folio: id, action: 'logical_delete' });

  } catch (error: any) {
    console.error('[DELETE] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}