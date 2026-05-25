import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const val = row[header] ?? '';
        const stringVal = String(val);
        return stringVal.includes(',') || stringVal.includes('"') 
          ? `"${stringVal.replace(/"/g, '""')}"` 
          : stringVal;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getProxyImageUrl(url: string | undefined): string {
  if (!url) return '/placeholder-image.png';
  
  // ✅ Base64: devolver tal cual (funciona en preview local)
  if (url.startsWith('data:image')) {
    return url;
  }
  
  // ✅ Cloudinary: URLs directas, sin proxy necesario
  if (url.includes('res.cloudinary.com') || url.includes('cloudinary.com')) {
    return url;
  }
  
  // ✅ Google Drive: usar proxy para evitar CORS
  if (url.includes('drive.google.com') || url.includes('googledrive.com')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  
  // ✅ Otras URLs directas (imgur, etc.)
  return url;
}

// =====================================================
// MAPEO DE STATUS LOGÍSTICA: Código <-> Label
// =====================================================
export const STATUS_LOGISTICS_MAP: Record<string, string> = {
  'COMPRADO': 'Comprado en USA',
  'COMPRADO_MX': 'Comprado en México',
  'EN_RUTA': 'En Ruta a Zafi',
  'EN_BODEGA': 'Recibido en Zafi',
  'ENVIADO': 'Enviado a México',
  'ENTREGADO': 'Entregado',
};

export const STATUS_LOGISTICS_REVERSE: Record<string, string> = {
  'Comprado en USA': 'COMPRADO',
  'Comprado en México': 'COMPRADO_MX',
  'En Ruta a Zafi': 'EN_RUTA',
  'Recibido en Zafi': 'EN_BODEGA',
  'Enviado a México': 'ENVIADO',
  'Entregado': 'ENTREGADO',
};

// Convierte código (COMPRADO) a label (Comprado en USA)
export function statusCodeToLabel(code: string): string {
  return STATUS_LOGISTICS_MAP[code] || code;
}

// Convierte label (Comprado en USA) a código (COMPRADO)
export function statusLabelToCode(label: string): string {
  return STATUS_LOGISTICS_REVERSE[label] || label;
}

// Limpia strings monetarios: "$2,289.00" -> 2289
export function cleanMonetaryString(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value)
    .replace(/[$\s]/g, '')
    .replace(/,/g, '')
    .replace(/\((.*)\)/, '-$1');
  return parseFloat(cleaned) || 0;
}

