import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

function checkCloudinaryConfig(): string | null {
  const missing: string[] = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');
  return missing.length > 0 ? `Cloudinary config incompleta: ${missing.join(', ')}` : null;
}

function ensureCloudinaryConfig(): void {
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(request: Request) {
  try {
    const configError = checkCloudinaryConfig();
    if (configError) {
      return NextResponse.json({ error: configError, details: 'Configuración incompleta en producción' }, { status: 400 });
    }
    ensureCloudinaryConfig();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    const uploadResult = await cloudinary.v2.uploader.upload(dataURI, {
      folder: 'sneakerguys',
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format
    });

  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al subir imagen',
      details: error.toString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    cloud: 'cloudinary',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'no configurado'
  });
}