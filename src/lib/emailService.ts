import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';

const getAuthClient = () => {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
  if (!clientEmail || !privateKey) return null;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
};

const getGmailAuth = async () => {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
  if (!clientEmail || !privateKey) return null;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/gmail.send']
  });
  
  await auth.authorize();
  return auth;
};

const formatHtmlEmail = (name: string, idCode: string, appUrl: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8faf9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="background-color: #0a0a0a; padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
        The Sneecker <span style="color: #ff4d4d;">Guys</span>
      </h1>
      <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
        Sales & Stock Manager
      </p>
    </div>
    
    <!-- Content -->
    <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <h2 style="color: #0a0a0a; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">
        ¡Hola, ${name}! 👟
      </h2>
      
      <p style="color: #374151; margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
        Gracias por registrarte en <strong>The Sneecker Guys</strong>. Tu cuenta ha sido creada exitosamente y ya puedes acceder a nuestra plataforma de gestión de inventario y pedidos.
      </p>
      
      <div style="background-color: #f8faf9; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
        <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
          Tu código de acceso
        </p>
        <p style="color: #0a0a0a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px;">
          ${idCode}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}" 
           style="display: inline-block; background-color: #0a0a0a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
          Acceder a la App
        </a>
      </div>
      
      <p style="color: #9ca3af; margin: 30px 0 0 0; font-size: 13px; text-align: center;">
        Si no puedes ver el botón, copia y pega este enlace en tu navegador:<br>
        <a href="${appUrl}" style="color: #ff4d4d;">${appUrl}</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #0a0a0a; padding: 25px 30px; text-align: center; border-radius: 0 0 16px 16px;">
      <p style="color: #6b7280; margin: 0; font-size: 11px;">
        © 2024 The Sneecker Guys. Todos los derechos reservados.<br>
        Este correo fue enviado automáticamente. Por favor no respondes a este mensaje.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export async function sendWelcomeEmail(clientName: string, clientEmail: string, idCode: string, appUrl?: string) {
  const destUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://sneaker-guy-app.vercel.app';
  const fromEmail = process.env.EMAIL_FROM || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  console.log('[Email] Sending welcome email to:', clientEmail);
  console.log('[Email] ID Code:', idCode);
  
  // Try to send via Gmail API
  if (fromEmail) {
    try {
      const auth = await getGmailAuth();
      if (auth) {
        const gmail = google.gmail({ version: 'v1', auth });
        
        const htmlBody = formatHtmlEmail(clientName, idCode, destUrl);
        
        const message = [
          `From: The Sneecker Guys <${fromEmail}>`,
          `To: ${clientEmail}`,
          'Content-Type: text/html; charset=utf-8',
          `Subject: =?UTF-8?B?${Buffer.from('¡Bienvenido a The Sneecker Guys! 👟').toString('base64')}?=`,
          '',
          htmlBody
        ].join('\n');
        
        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });
        
        console.log('[Email] Sent successfully via Gmail API');
        
        // Log to sheet
        await logEmailSent(clientEmail, 'Bienvenido a The Sneecker Guys', idCode, 'ENVIADO');
        
        return { success: true };
      }
    } catch (error) {
      console.error('[Email] Gmail API error:', error);
    }
  }
  
  // Log failure to sheet
  await logEmailSent(clientEmail, 'Bienvenido a The Sneecker Guys', idCode, 'FALLO');
  
  return { success: false, logged: true };
}

async function logEmailSent(destinatario: string, asunto: string, idCliente: string, status: string) {
  try {
    const auth = getAuthClient();
    if (!auth) return;
    
    const sheets = google.sheets({ version: 'v4', auth });
    const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'LOG_EMAILS!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          fecha,
          destinatario,
          asunto,
          idCliente,
          status
        ]]
      },
    });
  } catch (error) {
    console.error('[Email] Log error:', error);
  }
}

export async function sendStatusUpdateEmail(clientEmail: string, clientName: string, orderId: string, newStatus: string, appUrl?: string) {
  const statusMessages: Record<string, { subject: string, message: string }> = {
    'COMPRADO': { subject: 'Pedido Confirmado', message: 'Tu pedido ha sido confirmado y está siendo procesado.' },
    'EN_RUTA': { subject: 'Pedido en Camino', message: 'Tu pedido está en camino hacia nuestro warehouse.' },
    'EN_BODEGA': { subject: 'Pedido Recibido', message: 'Tu pedido ha llegado a nuestro warehouse en Zafi.' },
    'ENVIADO': { subject: 'Pedido Enviado', message: 'Tu pedido ha sido enviado a México.' },
    'ENTREGADO': { subject: 'Pedido Entregado', message: 'Tu pedido ha sido entregado. ¡Disfrítalo!' }
  };
  
  const status = statusMessages[newStatus] || { subject: 'Actualización de Pedido', message: 'Hay una actualización en tu pedido.' };
  const destUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://sneaker-guy-app.vercel.app';
  const fromEmail = process.env.EMAIL_FROM || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  console.log('[Email] Sending status update to:', clientEmail, 'Status:', newStatus);
  
  if (fromEmail) {
    try {
      const auth = await getGmailAuth();
      if (auth) {
        const gmail = google.gmail({ version: 'v1', auth });
        
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f8faf9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #0a0a0a; padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">
        The Sneecker <span style="color: #ff4d4d;">Guys</span>
      </h1>
    </div>
    <div style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <h2 style="color: #0a0a0a; margin: 0 0 20px 0;">${status.subject}</h2>
      <p style="color: #374151; margin: 0 0 20px 0;">Hola ${clientName}, ${status.message}</p>
      <div style="background-color: #f8faf9; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 12px;">Número de Pedido</p>
        <p style="color: #0a0a0a; margin: 0; font-size: 24px; font-weight: 700;">${orderId}</p>
      </div>
    </div>
    <div style="background-color: #0a0a0a; padding: 25px 30px; text-align: center; border-radius: 0 0 16px 16px;">
      <p style="color: #6b7280; margin: 0; font-size: 11px;">© 2024 The Sneecker Guys</p>
    </div>
  </div>
</body>
</html>
        `.trim();
        
        const fullSubject = `The Sneecker Guys - ${status.subject}: ${orderId}`;
        
        const message = [
          `From: The Sneecker Guys <${fromEmail}>`,
          `To: ${clientEmail}`,
          'Content-Type: text/html; charset=utf-8',
          `Subject: =?UTF-8?B?${Buffer.from(fullSubject).toString('base64')}?=`,
          '',
          htmlBody
        ].join('\n');
        
        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });
        
        console.log('[Email] Status update sent successfully');
        
        await logEmailSent(clientEmail, fullSubject, orderId, 'ENVIADO');
        
        return { success: true };
      }
    } catch (error) {
      console.error('[Email] Status update error:', error);
    }
  }
  
  await logEmailSent(clientEmail, status.subject, orderId, 'FALLO');
  
  return { success: false };
}