/**
 * EJECUTAR EN: https://script.google.com
 * Muestra los datos RAW originales para que puedas decidir el mapeo correcto
 * Ejecuta showRawOriginalData()
 */

function showRawOriginalData() {
  const SHEET_ID = '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('MASTER_DATA');
  
  if (!sheet) {
    Logger.log('❌ Sheet MASTER_DATA no encontrado');
    return;
  }
  
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  
  // Las cabeceras ORIGINALES (las que estaban antes del fix)
  const originalHeaders = [
    'ID_UNICO', 'FECHA_REGISTRO', 'NUMERO_PEDIDO', 'CLIENTE_NOMBRE', 'CLIENTE_EMAIL',
    'CLIENTE_TELEFONO', 'REFERIDO_POR', 'METODO_PAGO_CLIENTE', 'ARTICULO_DETALLE',
    'CATEGORIA', 'SUBCATEGORIA', 'TALLA', 'COLOR', 'BOUTIQUE_ORIGEN', 'TARJETA_PAGO',
    'TIPO_COMPRA', 'COSTO_USD', 'TIPO_CAMBIO', 'COSTO_MXN', 'PRECIO_VENTA_MXN',
    'UTILIDAD_BRUTA', 'STATUS_ENTREGA', 'UBICACION_ACTUAL', 'NOTAS',
    'INCLUIDO_EN_CORTE_ZAFIRO', 'ESTADO_ENTREGA_MX', 'FECHA_ENTREGA_CLIENTE',
    'ANTICIPO_ABONADO', 'TOTAL_PAGADO', 'SALDO_PENDIENTE', 'ABONADO_AMEX',
    'UTILIDAD_TOMADA', 'REVISADO_RODRIGO', 'OBSERVACIONES_NOTAS',
    'ULTIMO_STATUS_NOTIFICADO', 'TOTAL_COSTO_USD', 'TOTAL_COSTO_MXN', 'TAGS'
  ];
  
  // Obtener datos actuales
  const data = sheet.getRange(2, 1, Math.min(5, lastRow - 1), lastCol).getValues();
  
  let output = '=== DATOS ACTUALES EN CADA COLUMNA ===\n\n';
  
  data.forEach((row, rowIdx) => {
    output += `--- FILA ${rowIdx + 2} ---\n`;
    row.forEach((val, colIdx) => {
      const header = originalHeaders[colIdx] || `COL_${colIdx}`;
      if (val && val.toString().trim() !== '') {
        output += `${header} [${colIdx}]: ${val}\n`;
      }
    });
    output += '\n';
  });
  
  Logger.log(output);
  Browser.msgBox(output);
}

// =====================================================
// VERSIÓN SIMPLE - Muestra la primera fila con letras de columna
// =====================================================
function showColumnsWithLetters() {
  const SHEET_ID = '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('MASTER_DATA');
  
  const lastCol = 42; // Cantidad original de columnas
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row1 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  const row2 = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
  
  let output = 'COLUMNA | CABECERA | FILA 2 | FILA 3\n';
  output += '--------|----------|--------|--------\n';
  
  for (let i = 0; i < lastCol; i++) {
    const colLetter = String.fromCharCode(65 + (i >= 26 ? 1 : 0) + (i >= 52 ? 1 : 0));
    const h = headers[i] || '';
    const r1 = row1[i] || '';
    const r2 = row2[i] || '';
    
    // Solo mostrar columnas con datos
    if (r1 || r2) {
      output += `${colLetter} | ${h} | ${r1} | ${r2}\n`;
    }
  }
  
  Logger.log(output);
  Browser.msgBox(output);
}