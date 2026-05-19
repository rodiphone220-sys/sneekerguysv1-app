const { google } = require('googleapis');

const SERVICE_ACCOUNT_EMAIL = 'thesneackerguysfinal@the-sneekerguy-v10n-stockmng.iam.gserviceaccount.com';
const PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDKZXVVPkHzp9sQ\nAmLi+NKkiMNFG12w9OmyfreZFfJvFjia/j5sYPsgxhKozG8v5Ofgdt81uIYYgKpn\nnpVRALCMh9ckULTvXi/Tjel9puWvT9ZS6MezLroagLeO+2B+Ir6vFFShjI56nyoq\n8sAiOSks92XNgXQflntr/Iaafju/xXcqNIaLJCK+W1sL6U8zhPZJMI2cDQbytPaI\n5ehHOq6wgzedFMoSMP0vFklCnGCU71iEwjiZIqXVglejZm6Cy3zaONMWa6x/QM3c\nTbcOZTf6PJ3/Z5lXvUQ2SCZDtK4URR5APDO5JbaaXctZsfu1wO4MST3WVV4E6x3C\nH0O78fDJAgMBAAECggEABBz6fNZgcP8V673+rDnuDve0DzcaiPZ7OtxKJydr5z/K\ne/TjiCCS7fQ0jB9meZDTeQt1ZxI2UHBp9iPiCTTEQcDfeY6V1MEDZA9f4cS26YCL\n/KCcMVsnX1NDF7nqWLnkSerV+vgAK8QJD3kiODfU60PmWt4xAdTVMok9440h8fhc\nM46nkqgcs48qoqV6LgC9zhdi/NFca1+bRAhpqrESXORgwmLp9tuyAJuLDsMvfRz/\n+gkUVAXMktSL15hN2eR85kmX+V8pXzo3RqzHOa/79pVJbOdyyUrCLhj231kLLEjp\n2nkZ3HWYWjJHIZ2eE5/I/bMGaaB/+y7+VdIHT5xBgQKBgQD6j1iHgs81ri+zAbsy\nb/euH1jCRYG6iYk99rOMb6VDJU3SsCN/G47pQJQJve1hgfOXD+0zA3gAYCrZFP2u\n9JWF0/cC84dAiT0x0LIf1rv5uoAdGQ8tEnu1jpQs6la1s/+bcqmttJHScZrph/LS\nmU56CrQ754ibKDzDK4xAw+bagQKBgQDOymk4wYPH0EMRkzp4pOjVvAGJazASugnL\nC2YlI2OH8yXkZ/7xxguaowiSQQ0I9q7CGSk8cOfrOta6eYa4KmmdBGJj897rwQsU\nwBUuzkokaGOIVdPbfXHnSqtnBGDTSdagi5reU648eMqzIfh/lVNpv/y7RC6ZdBl7\nwZVdbNiiSQKBgDR7F+DyXjJxNJ5661nKKAe5mx697klDC5MF/F+a9vOUebN6n0S9\nYfarRxavSGxXCs2GUXmQ7W6uterYQbaGllb8qc1dcuPqmv23J8gRczgAf1sY55va\nNj02CwVJZDYU6KIHp1Cx9KUulHL7vbms0MoxOcUeXveYuvlqQqtCHTWBAoGAOtMj\nmYybAzVATviV0on+3gYsXb4LH9iiPotQlFH710mYxt+6i2ZuGKA2KPyuS5V44ygr\nLdFkd+r1+Hfnle4iuxLrNknCaUgx8cYugHEYcEDtx3O6355Qz53TImwBazl+/46X\nEJW3Y+ZsqwaH3StKXjPKHi9oHikDssu/xKLZAVkCgYEAkiZbuknHnK+3JgMeJAIG\nrK7s5RbN8D8Bp/xjxuu1KodhngvoVEgan0zaYIpP3IyG5er/+MZWrXOwX8cN/zrw\nMbMNRhUoijVHsRGIviSjpXq7OgikXJBvp0IYf2bTQ3CRsu3IIa5Lge5ggDGnZPlb\nd5gEpnGEU+u72AW6xiRBYJE=\n-----END PRIVATE KEY-----';
const SHEET_ID = '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';

const auth = new google.auth.JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  console.log('=== CABECERAS (FILA 1) ===\n');
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'MASTER_DATA'!1:1"
  });
  const headers = headerRes.data.values?.[0] || [];
  headers.forEach((h, i) => console.log(`${i}: ${h}`));

  console.log('\n=== PRIMERA FILA DE DATOS (FILA 2) ===\n');
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'MASTER_DATA'!2:2"
  });
  const row = dataRes.data.values?.[0] || [];
  row.forEach((v, i) => console.log(`${i}: ${v}`));

  console.log('\n=== RESUMEN: TOTAL COLUMNAS ===');
  console.log(`Cabeceras: ${headers.length}, Datos fila 2: ${row.length}`);
}

main().catch(console.error);