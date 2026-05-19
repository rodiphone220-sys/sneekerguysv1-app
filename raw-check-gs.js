/**
 * EJECUTAR EN: https://script.google.com
 * Muestra TODAS las columnas con su índice y valores actuales
 */

function rawCheck() {
  const SHEET_ID = '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('MASTER_DATA');
  
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row1 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  
  let output = 'ÍNDICE | LETRA | CABECERA ACTUAL | VALOR FILA 2\n';
  output += '-------|-------|-----------------|-------------\n';
  
  for (let i = 0; i < lastCol; i++) {
    const letter = i < 26 ? String.fromCharCode(65 + i) : 
                   i < 52 ? 'A' + String.fromCharCode(65 + i - 26) :
                   'B' + String.fromCharCode(65 + i - 52);
    const h = headers[i] || '';
    const v = row1[i] || '';
    output += `${i.toString().padStart(2)} | ${letter} | ${h.substring(0,18)} | ${v}\n`;
  }
  
  output += '\n\n';
  output += '=== RESUMEN DE DATOS EN FILA 2 ===\n';
  output += 'Basado en lo que SEBSRCIBE la app:\n\n';
  output += `SKU/ID: ${row1[0]}\n`;
  output += `Nombre Artículo: ${row1[8]}\n`;
  output += `Categoría: ${row1[9]}\n`;
  output += `Marca: ${row1[11]}\n`;
  output += `Talla: ${row1[13]}\n`;
  output += `Color: ${row1[14]}\n`;
  output += `Género: ${row1[15]}\n`;
  output += `Boutique: ${row1[16]}\n`;
  output += `Costo USD: ${row1[19]}\n`;
  output += `Tipo Cambio: ${row1[20]}\n`;
  output += `Costo MXN: ${row1[21]}\n`;
  output += `Precio Venta: ${row1[22]}\n`;
  output += `Status: ${row1[24]}\n`;
  
  Logger.log(output);
  Browser.msgBox(output);
}