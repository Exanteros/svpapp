import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';

// SendGrid Inbound Parse Webhook
export async function POST(request: NextRequest) {
  try {
    console.log('📧 SendGrid Webhook received');
    
    // SendGrid sendet multipart/form-data für Inbound Parse
    const formData = await request.formData();
    
    const to = formData.get('to') as string;
    const from = formData.get('from') as string;
    const subject = formData.get('subject') as string;
    const text = formData.get('text') as string;
    const html = formData.get('html') as string;
    const envelope = formData.get('envelope') as string;
    
    console.log('Processing SendGrid inbound email:', {
      from,
      to,
      subject
    });
    
    const db = getDatabase();
    const emailService = new EmailService(db);
    
    // Finde die Team-Email anhand der To-Adresse
    const teamEmail = await emailService.findTeamEmailByAddress(to);
    
    if (!teamEmail) {
      console.log('No team email found for address:', to);
      return NextResponse.json({ 
        success: false, 
        error: 'Team email not found' 
      }, { status: 404 });
    }
    
    console.log('Found team email:', teamEmail);
    
    // Speichere die eingehende E-Mail über processIncomingEmail
    const result = await emailService.processIncomingEmail(
      to,           // toEmail
      from,         // fromEmail 
      subject,      // subject
      text,         // textBody
      html,         // htmlBody
      `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // messageId
      '',           // inReplyTo
      [],           // attachments
      JSON.stringify({ envelope, to, from, subject }) // rawEmail
    );
    
    console.log('✅ SendGrid incoming email saved successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email processed successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error processing SendGrid webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Für Webhook-Verifikation
export async function GET() {
  return NextResponse.json({ 
    message: 'SendGrid webhook endpoint ready',
    timestamp: new Date().toISOString()
  });
}
