/**
 * EJECUTAR EN: https://script.google.com
 * Copia este código en el editor de Apps Script y ejecuta checkSheetColumns()
 */

function checkSheetColumns() {
  const SHEET_ID = '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('MASTER_DATA');
  
  if (!sheet) {
    Logger.log('❌ Sheet MASTER_DATA no encontrado');
    return;
  }
  
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  
  Logger.log('=== DIMENSIONES ===');
  Logger.log(`Filas: ${lastRow}, Columnas: ${lastCol}`);
  
  // Obtener cabeceras (fila 1)
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  Logger.log('\n=== CABECERAS (FILA 1) ===');
  headers.forEach((h, i) => {
    const colLetter = String.fromCharCode(65 + i);
    Logger.log(`${colLetter} (${i}): ${h}`);
  });
  
  // Obtener primera fila de datos (fila 2)
  const firstDataRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  
  Logger.log('\n=== PRIMERA FILA DE DATOS (FILA 2) ===');
  firstDataRow.forEach((v, i) => {
    const colLetter = String.fromCharCode(65 + i);
    Logger.log(`${colLetter} (${i}): ${v}`);
  });
  
  // Mostrar en ventana
  const output = `DIMENSIONES: ${lastRow} filas x ${lastCol} columnas

CABECERAS:
${headers.map((h, i) => `${String.fromCharCode(65 + i)}[${i}]: ${h}`).join('\n')}

PRIMERA FILA DE DATOS:
${firstDataRow.map((v, i) => `${String.fromCharCode(65 + i)}[${i}]: ${v}`).join('\n')}`;
  
  Logger.log(output);
  Browser.msgBox(output);
}

// =====================================================
// MAPEO ACTUAL (según route.ts - 38 columnas)
// =====================================================
// Col 0 (A): ID_UNICO
// Col 1 (B): FECHA_REGISTRO
// Col 2 (C): NUMERO_PEDIDO
// Col 3 (D): CLIENTE_NOMBRE
// Col 4 (E): CLIENTE_EMAIL
// Col 5 (F): CLIENTE_TELEFONO
// Col 6 (G): REFERIDO_POR
// Col 7 (H): METODO_PAGO_CLIENTE
// Col 8 (I): ARTICULO_MODELO
// Col 9 (J): CATEGORIA
// Col 10 (K): BOUTIQUE_ORIGEN
// Col 11 (L): LINK_IMAGENES
// Col 12 (M): ORIGEN_ARTICULO
// Col 13 (N): COSTO_USD
// Col 14 (O): TIPO_CAMBIO
// Col 15 (P): TIPO_COMPRA
// Col 16 (Q): COSTO_USD2
// Col 17 (R): RESERVADO
// Col 18 (S): COSTO_MXN
// Col 19 (T): PRECIO_VENTA_MXN
// Col 20 (U): UTILIDAD_BRUTA
// Col 21 (V): STATUS_LOGISTICA
// Col 22 (W): UBICACION_DESTINO
// Col 37 (AL): TAGS