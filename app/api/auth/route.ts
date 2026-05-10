import { google } from 'googleapis';
import { sendWelcomeEmail } from './emailService';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';

const getAuthClient = () => {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
  if (!clientEmail || !privateKey) return null;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
};

const generateIdCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TSG-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generateUserId = (): string => {
  return 'USR-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
};

// POST - Login con Google o Registro
export async function POST(request: Request) {
  try {
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    
    const body = await request.json();
    const { action, email, name, role, idCode } = body;
    
    const sheets = google.sheets('v4');
    
    // Obtener todos los usuarios
    const response = await sheets.spreadsheets.values.get({ 
      auth, 
      spreadsheetId: SHEET_ID, 
      range: "'USUARIOS'!A2:I" 
    });
    
    const rows = response.data.values || [];
    
    // Acción: LOGIN
    if (action === 'login') {
      // Buscar usuario por email
      const user = rows.find((row: any[]) => row[3]?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return Response.json({ 
          exists: false, 
          message: 'Usuario no encontrado. Regístrate primero.',
          redirectTo: '/registro'
        });
      }
      
      // Verificar que esté activo
      const activo = user[8]?.toUpperCase() === 'TRUE' || user[8] === '1';
      if (!activo) {
        return Response.json({ error: 'Usuario inactivo. Contacta al administrador.' }, { status: 403 });
      }
      
      // Actualizar último login
      const rowIndex = rows.indexOf(user) + 2;
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: SHEET_ID,
        range: `'USUARIOS'!H${rowIndex}:H${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[new Date().toISOString().split('T')[0]]] }
      });
      
      return Response.json({
        exists: true,
        user: {
          id: user[0],
          idCode: user[1],
          nombre: user[2],
          email: user[3],
          rol: user[4],
          permisos: user[7],
          activo: true
        }
      });
    }
    
    // Acción: REGISTRO
    if (action === 'register') {
      // Verificar si el email ya existe
      const existingUser = rows.find((row: any[]) => row[3]?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return Response.json({ error: 'El email ya está registrado' }, { status: 400 });
      }
      
      // Validar ID_CODE para roles que no son MASTER 1
      if (role !== 'MASTER 1') {
        if (!idCode) {
          return Response.json({ error: 'ID_CODE es obligatorio para este rol' }, { status: 400 });
        }
        // Verificar que el ID_CODE pertenezca a un MASTER 1 activo
        const masterExists = rows.find((row: any[]) => 
          row[1]?.toUpperCase() === idCode.toUpperCase() && 
          row[4] === 'MASTER 1' &&
          (row[8]?.toUpperCase() === 'TRUE' || row[8] === '1')
        );
        if (!masterExists) {
          return Response.json({ error: 'ID_CODE inválido o no pertenece a un MASTER 1 activo' }, { status: 400 });
        }
      }
      
      // Generar ID_CODE para MASTER 1
      let newIdCode = idCode;
      if (role === 'MASTER 1') {
        // Verificar que no exista otro MASTER 1 con el mismo código
        do {
          newIdCode = generateIdCode();
        } while (rows.some((row: any[]) => row[1] === newIdCode));
      }
      
      // Crear nuevo usuario
      const newUserId = generateUserId();
      const today = new Date().toISOString().split('T')[0];
      
      // Definir permisos según rol
      const permisos = role === 'MASTER 1' || role === 'MASTER 2' 
        ? 'ADMIN,TODOS' 
        : role === 'CONTABILIDAD' 
          ? 'CONTABILIDAD,LECTURA' 
          : 'POS,VENTAS,LECTURA';
      
      const newUser = [
        newUserId,           // A: ID_USUARIO
        newIdCode,           // B: ID_CODE
        name,                // C: NOMBRE
        email,               // D: EMAIL
        role,                // E: ROL
        today,               // F: FECHA_ALTA
        today,               // G: ULTIMO_LOGIN
        permisos,            // H: PERMISOS
        'TRUE'               // I: ACTIVO
      ];
      
      await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'USUARIOS'!A:A",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newUser] }
      });
      
      // Enviar correo de bienvenida
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sneaker-guy-app.vercel.app';
        await sendWelcomeEmail(name, email, newIdCode, appUrl);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
      
      return Response.json({
        success: true,
        user: {
          id: newUserId,
          idCode: newIdCode,
          nombre: name,
          email: email,
          rol: role,
          permisos: permisos,
          activo: true
        }
      });
    }
    
    return Response.json({ error: 'Acción no válida' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Auth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// GET - Verificar si email existe o listar usuarios
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const listAll = searchParams.get('all') === 'true';
    
    const auth = getAuthClient();
    if (!auth) return Response.json({ error: 'Auth failed' }, { status: 500 });
    
    const sheets = google.sheets('v4');
    const response = await sheets.spreadsheets.values.get({ 
      auth, 
      spreadsheetId: SHEET_ID, 
      range: "'USUARIOS'!A2:I" 
    });
    
    const rows = response.data.values || [];
    
    // Si pide listar todos los usuarios
    if (listAll) {
      const headers = ['ID_USUARIO', 'NOMBRE', 'EMAIL', 'ROL', 'ACTIVO'];
      const users = rows.map((row: any[]) => ({
        id: row[0] || '',
        nombre: row[1] || '',
        email: row[2] || '',
        rol: row[3] || '',
        activo: row[4] === 'TRUE'
      })).filter((u: any) => u.nombre);
      return Response.json(users);
    }
    
    // Verificar si email existe
    if (!email) {
      return Response.json({ error: 'Email o parámetro "all" requerido' }, { status: 400 });
    }
    
    const user = rows.find((row: any[]) => row[3]?.toLowerCase() === email.toLowerCase());
    
    if (user) {
      return Response.json({ exists: true });
    }
    return Response.json({ exists: false, redirectTo: '/registro' });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}