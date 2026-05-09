import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const DRIVE_FOLDER_ID = '1uvi8Ue1Y-uyTXf8KK6h2sDwsmsyGl_YH';

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
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ]
    });

    // Force auth
    await auth.authorize();
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Try to list root folder first to see if Drive is accessible at all
    try {
      const about = await drive.about.get({ fields: 'user, storageQuota' });
      console.log('User:', about.data.user?.emailAddress);
    } catch (e: any) {
      console.log('About error:', e.message);
    }
    
    // Try to find folder by name instead
    const searchResult = await drive.files.list({
      q: "name='imagenes_backup_thesneekerguy_v12' and trashed=false",
      fields: 'files(id, name, parents)',
      spaces: 'drive'
    });
    
    if (searchResult.data.files && searchResult.data.files.length > 0) {
      const folder = searchResult.data.files[0];
      return NextResponse.json({ 
        success: true, 
        folderId: folder.id,
        folderName: folder.name,
        message: 'Folder found by name'
      });
    }
    
    // Try direct access with different approach
    try {
      const folderMeta = await drive.files.get({ 
        fileId: DRIVE_FOLDER_ID,
        fields: 'id, name, permissions, owners'
      });
      return NextResponse.json({ 
        success: true, 
        folderId: folderMeta.data.id,
        folderName: folderMeta.data.name
      });
    } catch (folderErr: any) {
      return NextResponse.json({ 
        error: 'No se puede acceder a la carpeta',
        folderError: folderErr.message,
        suggestions: [
          'Verificar que el folder existe',
          'Verificar que el service account tiene acceso',
          'El folder puede haber sido movido a la papelera'
        ]
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}