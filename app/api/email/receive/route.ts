import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';

// Webhook für eingehende E-Mails (HTTP Fallback/Test)
export async function POST(request: NextRequest) {
  try {
    console.log('📧 Incoming email webhook triggered');
    
    const contentType = request.headers.get('content-type') || '';
    let emailData: any;

    // Parse verschiedene Content-Types
    if (contentType.includes('application/json')) {
      emailData = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      emailData = Object.fromEntries(formData);
    } else {
      const rawBody = await request.text();
      console.log('Raw email body:', rawBody);
      
      // Parse raw email data
      emailData = parseRawEmail(rawBody);
    }

    console.log('📨 Parsed email data:', emailData);

    // Extrahiere E-Mail-Felder
    const {
      to,
      from,
      subject,
      text,
      html,
      messageId,
      inReplyTo,
      attachments
    } = emailData;

    if (!to || !from) {
      console.log('❌ Missing required fields: to, from');
      return NextResponse.json({
        success: false,
        error: 'Missing required email fields'
      }, { status: 400 });
    }

    const db = getDatabase();
    const emailService = new EmailService(db);

    console.log('📧 Processing email:', { to, from, subject });

    // Verarbeite eingehende E-Mail
    const result = await emailService.processIncomingEmail(
      to,
      from,
      subject || 'Keine Betreffzeile',
      text,
      html,
      messageId || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      inReplyTo,
      attachments ? JSON.parse(attachments) : [],
      JSON.stringify(emailData)
    );

    if (result.success) {
      console.log('✅ Email processed successfully:', result.conversationId);
      
      return NextResponse.json({
        success: true,
        message: 'Email processed',
        conversationId: result.conversationId
      });
    } else {
      console.error('❌ Email processing failed:', result.error);
      
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed'
    }, { status: 500 });
  }
}

// GET für Webhook-Status
export async function GET() {
  return NextResponse.json({
    webhook: "integrated-email-system",
    status: "active",
    mode: "internal-smtp-server", 
    accepts: ["SMTP (Port 2525)", "HTTP JSON (für Tests)"],
    domain: process.env.TEAM_EMAIL_DOMAIN,
    instructions: [
      "SMTP-Server läuft integriert in Next.js",
      "Konfiguriere MX-Record auf deinen Server", 
      "Oder teste mit HTTP POST für Simulation"
    ]
  });
}

// Helper: Parse raw email data
function parseRawEmail(rawEmail: string): any {
  const lines = rawEmail.split('\n');
  const headers: any = {};
  let bodyStart = 0;

  // Parse headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      bodyStart = i + 1;
      break;
    }
    
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).toLowerCase().trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  // Parse body
  const body = lines.slice(bodyStart).join('\n').trim();

  return {
    to: headers.to || headers['delivered-to'],
    from: headers.from,
    subject: headers.subject,
    text: body,
    html: body.includes('<') ? body : undefined,
    messageId: headers['message-id'],
    inReplyTo: headers['in-reply-to'],
    date: headers.date,
    raw: rawEmail
  };
}
