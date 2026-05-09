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

const mapProductToRow = (product: any): any[] => {
  const today = new Date().toISOString().split('T')[0];
  const sku = product.sku_manual || product.sku || product.id || '';
  
  // Limitar imageUrl - si es base64 muy largo, guardar solo indicador
  let imageLink = product.imageUrl || '';
  if (imageLink.startsWith('data:image')) {
    imageLink = '📷 Imagen cargada desde dispositivo';
  }
  if (imageLink.length > 49000) {
    imageLink = imageLink.substring(0, 49000) + '...';
  }
  
  return [
    sku, // A: ID_UNICO
    today, // B: FECHA_REGISTRO
    sku, // C: NUMERO_PEDIDO
    product.clientName || 'STOCK', // D: CLIENTE
    product.clientEmail || '', // E: CLIENTE_EMAIL
    product.clientPhone || '', // F: CLIENTE_TELEFONO
    product.clientAddress || '', // G: CLIENTE_DIRECCION
    product.referenciado_por || '', // H: REFERENCIADO_POR
    product.metodo_pago_cliente || '', // I: METODO_PAGO_CLIENTE
    product.name || '', // J: ARTICULO_DETALLE
    product.category || '', // K: CATEGORIA
    product.boutique || '', // L: BOUTIQUE_ORIGEN
    imageLink, // M: LINK_CARPETA_IMAGENES
    product.origen_articulo || product.tipo_compra || '', // N: TIPO_COMPRA
    product.buyPriceUsd || 0, // O: COSTO_USD
    product.exchangeRate || 18, // P: TIPO_CAMBIO
    product.buyPriceMxn || 0, // Q: COSTO_MXN
    product.sellPriceMxn || 0, // R: PRECIO_VENTA_MXN
    parseSheetNumber(product.sellPriceMxn) - parseSheetNumber(product.buyPriceMxn), // S: UTILIDAD_BRUTA
    product.costo_envio_usa || 0, // T: COSTO_ENVIO_USA
    product.estado_envio_usa || '', // U: ESTADO_ENVIO_USA
    product.estado_entrega_usa || '', // V: ESTADO_ENTREGA_USA
    product.ubicacion_actual || '', // W: UBICACION_ACTUAL
    product.fecha_ingreso_zafiro || '', // X: FECHA_INGRESO_ZAFIRO
    product.incluido_en_corte_zafiro || 'NO', // Y: INCLUIDO_EN_CORTE_ZAFIRO
    product.estado_entrega_mx || '', // Z: ESTADO_ENTREGA_MX
    product.fecha_entrega_cliente || '', // AA: FECHA_ENTREGA_CLIENTE
    product.anticipo_abonado || 0, // AB: ANTICIPO_ABONADO
    product.total_pagado || 0, // AC: TOTAL_PAGADO
    product.saldo_pendiente || 0, // AD: SALDO_PENDIENTE
    product.abonado_amex || 0, // AE: ABONADO_AMEX
    product.utilidad_tomada || 0, // AF: UTILIDAD_TOMADA
    product.revisado_rodrigo || 'NO', // AG: REVISADO_RODRIGO
    product.notes || product.internal_notes || '', // AH: OBSERVACIONES_NOTAS
    product.currentStatus || 'COMPRADO', // AI: ULTIMO_STATUS_NOTIFICADO
    product.totalBuyPriceUsd || product.buyPriceUsd || 0, // AJ: TOTAL_COSTO_USD
    product.totalBuyPriceMxn || product.buyPriceMxn || 0, // AK: TOTAL_COSTO_MXN
    product.payment_card || '', // AN: TARJETA_PAGO
    product.brand || '', // AO: SUBCATEGORIA (Marca)
    product.size || '', // AP: TALLA
    product.color_description || '', // AQ: COLOR
    product.gender || '', // AR: TAGS (Género)
  ];
};

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    
    const body = await request.json();
    const id = params.id;
    
    const sheets = google.sheets('v4');
    const getResponse = await sheets.spreadsheets.values.get({ 
      auth, 
      spreadsheetId: SHEET_ID, 
      range: "'MASTER_DATA'!A2:AR" 
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
      return Response.json({ error: 'Product not found', searchId }, { status: 404 });
    }
    
    const row = mapProductToRow(body);
    const updateRange = `'MASTER_DATA'!A${rowIndex}:AR`;
    
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