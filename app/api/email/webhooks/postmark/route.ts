import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';

// Webhook für Postmark
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    const db = getDatabase();
    const emailService = new EmailService(db);

    // Log den Webhook für Debugging
    await emailService.logWebhook('postmark', 'inbound', payload);

    // Verarbeite eingehende Email
    const result = await emailService.processIncomingEmail(
      payload.To || payload.ToFull?.[0]?.Email,
      payload.From || payload.FromFull?.Email,
      payload.Subject,
      payload.TextBody,
      payload.HtmlBody,
      payload.MessageID,
      payload.Headers?.['In-Reply-To'],
      payload.Attachments,
      JSON.stringify(payload)
    );

    if (result.success) {
      // Aktualisiere Webhook-Log
      await emailService.logWebhook('postmark', 'inbound', payload, true);
      
      // Optional: Sende Auto-Reply
      await sendAutoReply(emailService, payload);
      
      return NextResponse.json({ success: true });
    } else {
      // Log Fehler
      await emailService.logWebhook('postmark', 'inbound', payload, false, result.error);
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing Postmark webhook:', error);
    
    try {
      const db = getDatabase();
      const emailService = new EmailService(db);
      await emailService.logWebhook(
        'postmark', 
        'inbound', 
        {}, 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (logError) {
      console.error('Error logging webhook:', logError);
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendAutoReply(emailService: EmailService, incomingEmail: any) {
  try {
    // Hole Auto-Reply Template
    const template = await emailService.getEmailTemplate('auto_reply');
    if (!template) {
      return; // Kein Auto-Reply Template vorhanden
    }

    // Bestimme Team-Name aus der To-Adresse
    const toEmail = incomingEmail.To || incomingEmail.ToFull?.[0]?.Email;
    const teamEmail = await emailService.findTeamEmailByAddress(toEmail);
    
    if (!teamEmail) {
      return;
    }

    // Template-Variablen
    const variables = {
      senderName: incomingEmail.FromName || incomingEmail.From,
      teamName: teamEmail.email_alias || 'Team',
      originalSubject: incomingEmail.Subject || 'Ihre Nachricht',
      tournamentName: 'SVP Turnier 2024'
    };

    const subject = emailService.replaceTemplateVariables(template.subject, variables);
    const bodyHtml = emailService.replaceTemplateVariables(template.body_html, variables);
    const bodyText = template.body_text 
      ? emailService.replaceTemplateVariables(template.body_text, variables)
      : undefined;

    // TODO: Hier würde die Auto-Reply Email tatsächlich versendet
    console.log('Would send auto-reply:', {
      from: toEmail,
      to: incomingEmail.From,
      subject,
      bodyHtml,
      bodyText
    });

  } catch (error) {
    console.error('Error sending auto-reply:', error);
  }
}
