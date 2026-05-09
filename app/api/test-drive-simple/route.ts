import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
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
    
    const auth = new google.auth.JWT({ 
      email: clientEmail, 
      key: privateKey, 
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    
    await auth.authorize();
    const accessToken = (await auth.getAccessToken()).token;
    
    const folderId = '1uvi8Ue1Y-uyTXf8KK6h2sDwsmsyGl_YH';
    const boundary = '-------' + Date.now();
    const metadata = { name: 'test_file_' + Date.now() + '.txt', parents: [folderId] };
    
    const parts = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: text/plain',
      '',
      'Test from API - ' + new Date().toISOString(),
      `--${boundary}--`,
    ];
    
    // Add supportsAllDrives=true for Shared Drive access
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: parts.join('\r\n'),
      }
    );
    
    const fileData = await response.json();
    
    if (fileData.error) {
      return NextResponse.json({ error: fileData.error.message }, { status: 500 });
    }
    
    // Make public - also need supportsAllDrives
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions?supportsAllDrives=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      }
    );
    
    const getResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileData.id}?fields=webViewLink,name&supportsAllDrives=true`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    const viewData = await getResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Archivo creado exitosamente!',
      fileName: viewData.name,
      viewLink: viewData.webViewLink,
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}