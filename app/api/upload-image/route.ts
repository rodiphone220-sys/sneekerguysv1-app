import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!clientEmail || !privateKey) {
    return NextResponse.json({ error: 'Credenciales faltantes' }, { status: 500 });
  }
  
  try {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    const jwt = require('jsonwebtoken');
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };
    
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No se pudo obtener token' }, { status: 500 });
    }
    
    // Check root access
    console.log('Checking root...');
    const rootResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files/root',
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    console.log('Root status:', rootResponse.status);
    
    const rootData = await rootResponse.json();
    console.log('Root data:', rootData);
    
    // Try to create folder in root
    const folderName = 'SneakerGuy_Images';
    console.log('Creating folder:', folderName);
    
    const folderResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      }
    );
    
    const folderData = await folderResponse.json();
    console.log('Folder response:', folderData);
    
    if (folderData.error) {
      return NextResponse.json({ 
        error: folderData.error.message,
        errorCode: folderData.error.code,
        debug: { rootStatus: rootResponse.status }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      folderCreated: folderData.id,
      folderName: folderName,
      message: 'Carpeta creada en Mi Drive'
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}