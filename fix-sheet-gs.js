/**
 * EJECUTAR EN: https://script.google.com
 * Copia este código en el editor de Apps Script y ejecuta fixAndVerifySheet()
 * 
 * Este script:
 * 1. Lee los datos actuales
 * 2. Crea nuevas cabeceras correctas según lo que espera la app
 * 3. Reorganiza los datos en las columnas correctas
 * 4. Verifica el resultado
 */

function fixAndVerifySheet() {
  const SHEET_ID = '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('MASTER_DATA');
  
  if (!sheet) {
    Logger.log('❌ Sheet MASTER_DATA no encontrado');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  Logger.log(`📊 Sheet tiene ${lastRow} filas x ${lastCol} columnas`);
  
  // =====================================================
  // NUEVAS CABECERAS (según lo que espera la app)
  // =====================================================
  const newHeaders = [
    'ID_UNICO',           // 0: SKU/ID
    'FECHA_REGISTRO',     // 1: Fecha
    'NUMERO_PEDIDO',      // 2: Número pedido
    'CLIENTE_NOMBRE',     // 3: Cliente nombre
    'CLIENTE_EMAIL',      // 4: Cliente email
    'CLIENTE_TELEFONO',   // 5: Cliente teléfono
    'REFERIDO_POR',       // 6: Referido por
    'METODO_PAGO_CLIENTE',// 7: Método pago cliente
    'ARTICULO_MODELO',    // 8: Nombre/Modelo del artículo
    'CATEGORIA',          // 9: Categoría (TENIS, ZAPATOS, etc)
    'SUBCATEGORIA',       // 10: Subcategoría
    'MARCA',              // 11: Marca (Nike, Adidas, etc)
    'MODELO_DETALLE',     // 12: Modelo detallado
    'TALLA',              // 13: Talla
    'COLOR',              // 14: Color
    'GENERO',             // 15: Género
    'BOUTIQUE_ORIGEN',    // 16: Boutique/Tienda origen
    'TARJETA_PAGO',       // 17: Tarjeta de pago usada
    'TIPO_COMPRA',        // 18: NACIONAL o USA
    'COSTO_USD',          // 19: Costo en USD
    'TIPO_CAMBIO',        // 20: Tipo de cambio
    'COSTO_MXN',          // 21: Costo en MXN
    'PRECIO_VENTA_MXN',   // 22: Precio de venta en MXN
    'UTILIDAD_BRUTA',     // 23: Utilidad bruta
    'STATUS_LOGISTICA',   // 24: Status logística
    'UBICACION_ACTUAL',   // 25: Ubicación actual
    'ORIGEN_ARTICULO',    // 26: Origen artículo
    'LINK_IMAGENES',      // 27: Links de imágenes
    'ESTADO_ENVIO_USA',   // 28: Estado envío USA
    'FECHA_ENVIO',        // 29: Fecha envío
    'FECHA_LLEGADA',      // 30: Fecha llegada
    'ESTADO_ENTREGA_MX',  // 31: Estado entrega MX
    'FECHA_ENTREGA',      // 32: Fecha entrega cliente
    'ANTICIPO_ABONADO',   // 33: Anticipo abonado
    'TOTAL_PAGADO',       // 34: Total pagado
    'SALDO_PENDIENTE',    // 35: Saldo pendiente
    'OBSERVACIONES',      // 36: Notas/observaciones
    'TAGS'                // 37: Tags
  ];
  
  Logger.log('📝 Aplicando nuevas cabeceras...');
  
  // Obtener datos actuales (desde fila 2)
  const currentData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  Logger.log(`📋 Leyendo ${currentData.length} filas de datos...`);
  
  // Crear matriz de datos reorganizados
  const newData = [];
  
  currentData.forEach((row, rowIndex) => {
    const newRow = Array(38).fill('');
    
    // Mapear datos existentes a nuevas columnas
    // Basado en el análisis de los datos actuales:
    newRow[0] = row[0] || '';                                        // ID_UNICO
    newRow[1] = row[1] || '';                                        // FECHA_REGISTRO
    newRow[2] = row[2] || '';                                        // NUMERO_PEDIDO
    newRow[3] = row[3] || '';                                        // CLIENTE_NOMBRE
    newRow[4] = row[4] || '';                                        // CLIENTE_EMAIL
    newRow[5] = row[5] || '';                                        // CLIENTE_TELEFONO
    newRow[6] = row[6] || '';                                        // REFERIDO_POR
    newRow[7] = row[7] || '';                                        // METODO_PAGO_CLIENTE
    newRow[8] = row[8] || '';                                        // ARTICULO_MODELO (antes ARTICULO_DETALLE)
    newRow[9] = row[9] || '';                                        // CATEGORIA
    newRow[10] = row[10] || '';                                      // SUBCATEGORIA
    newRow[11] = row[11] || '';                                      // MARCA (antes TALLA - movido)
    newRow[12] = row[12] || '';                                      // MODELO_DETALLE (antes COLOR - movido)
    newRow[13] = row[13] || '';                                      // TALLA (antes BOUTIQUE - movido)
    newRow[14] = row[14] || '';                                      // COLOR (antes TARJETA_PAGO - movido)
    newRow[15] = row[15] || '';                                      // GENERO
    newRow[16] = parseNumber(row[13]) || 0;                          // BOUTIQUE_ORIGEN (antes COSTO_USD $320)
    newRow[17] = row[14] || '';                                      // TARJETA_PAGO (antes TIPO_CAMBIO $18.50)
    newRow[18] = row[15] || '';                                      // TIPO_COMPRA (antes TIPO_COMPRA 5920.00)
    newRow[19] = parseNumber(row[16]) || 0;                          // COSTO_USD (antes COSTO_USD $6,200)
    newRow[20] = parseNumber(row[17]) || 18;                        // TIPO_CAMBIO (antes TIPO_CAMBIO $280)
    newRow[21] = parseNumber(row[18]) || 0;                         // COSTO_MXN (antes COSTO_MXN $0)
    newRow[22] = parseNumber(row[19]) || 0;                          // PRECIO_VENTA_MXN
    newRow[23] = parseNumber(row[20]) || 0;                          // UTILIDAD_BRUTA
    newRow[24] = row[21] || '';                                      // STATUS_LOGISTICA (antes STATUS_ENTREGA)
    newRow[25] = row[22] || '';                                      // UBICACION_ACTUAL
    newRow[26] = row[26] || '';                                      // ORIGEN_ARTICULO
    newRow[27] = row[27] || '';                                      // LINK_IMAGENES
    newRow[28] = row[28] || '';                                      // ESTADO_ENVIO_USA
    newRow[29] = row[29] || '';                                      // FECHA_ENVIO
    newRow[30] = row[30] || '';                                      // FECHA_LLEGADA
    newRow[31] = row[31] || '';                                      // ESTADO_ENTREGA_MX
    newRow[32] = row[32] || '';                                      // FECHA_ENTREGA
    newRow[33] = parseNumber(row[27]) || 0;                          // ANTICIPO_ABONADO
    newRow[34] = parseNumber(row[28]) || 0;                          // TOTAL_PAGADO
    newRow[35] = parseNumber(row[29]) || 0;                          // SALDO_PENDIENTE
    newRow[36] = row[33] || '';                                      // OBSERVACIONES
    newRow[37] = row[37] || '';                                      // TAGS
    
    newData.push(newRow);
  });
  
  // Escribir nuevas cabeceras
  sheet.getRange(1, 1, 1, 38).setValues([newHeaders]);
  Logger.log('✅ Cabeceras actualizadas');
  
  // Escribir datos reorganizados
  if (newData.length > 0) {
    sheet.getRange(2, 1, newData.length, 38).setValues(newData);
    Logger.log(`✅ ${newData.length} filas de datos reorganizadas`);
  }
  
  // =====================================================
  // VERIFICACIÓN
  // =====================================================
  Logger.log('\n=== VERIFICACIÓN ===');
  
  // Leer primeras 3 filas para verificar
  const verifyHeaders = sheet.getRange(1, 1, 1, 38).getValues()[0];
  const verifyData1 = sheet.getRange(2, 1, 1, 38).getValues()[0];
  const verifyData2 = sheet.getRange(3, 1, 1, 38).getValues()[0];
  
  const output = `✅ PROCESO COMPLETADO

CABECERAS NUEVAS (primeras 10):
${verifyHeaders.slice(0, 10).map((h, i) => `${i}: ${h}`).join('\n')}

FILA 2 - PRIMER REGISTRO:
${verifyData1.slice(0, 20).map((v, i) => `${verifyHeaders[i]}: ${v}`).join('\n')}

FILA 3 - SEGUNDO REGISTRO:
${verifyData2.slice(0, 20).map((v, i) => `${verifyHeaders[i]}: ${v}`).join('\n')}`;

  Logger.log(output);
  Browser.msgBox(output);
  
  return { headers: newHeaders, dataSample: verifyData1 };
}

// Función auxiliar para convertir valores "$1,234.56" a numeros
function parseNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.toString().replace(/[$,\s]/g, '').replace(/\((.*)\)/, '-$1');
  return parseFloat(cleaned) || 0;
}

// Función simple de verificación (sin modificar datos)
function verifyOnly() {
  const SHEET_ID = '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('MASTER_DATA');
  
  const headers = sheet.getRange(1, 1, 1, 38).getValues()[0];
  const row1 = sheet.getRange(2, 1, 1, 38).getValues()[0];
  const row2 = sheet.getRange(3, 1, 1, 38).getValues()[0];
  
  let output = 'CABECERAS ACTUALES:\n';
  headers.forEach((h, i) => output += `${String.fromCharCode(65+i)}[${i}]: ${h}\n`);
  
  output += '\nFILA 2:\n';
  row1.forEach((v, i) => output += `${headers[i]}: ${v}\n`);
  
  output += '\nFILA 3:\n';
  row2.forEach((v, i) => output += `${headers[i]}: ${v}\n`);
  
  Logger.log(output);
  Browser.msgBox(output);
}