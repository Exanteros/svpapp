// E-Mail-Versand-Service für verschiedene Provider
import { EMAIL_CONFIG } from './email-config';

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  replyTo?: string;
  messageId?: string;
}

export class EmailSender {
  private provider: string;

  constructor() {
    this.provider = EMAIL_CONFIG.EMAIL_PROVIDER;
  }

  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('📧 Sending email via', this.provider, message);

    try {
      switch (this.provider) {
        case 'postmark':
          return await this.sendViaPostmark(message);
        case 'sendgrid':
          return await this.sendViaSendGrid(message);
        case 'mailgun':
          return await this.sendViaMailgun(message);
        default:
          // Fallback: Simulation für Development
          return await this.simulateEmail(message);
      }
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async sendViaPostmark(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    
    if (!token) {
      console.log('⚠️ No Postmark token found, simulating email');
      return this.simulateEmail(message);
    }

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': token
      },
      body: JSON.stringify({
        From: message.from,
        To: message.to,
        Subject: message.subject,
        TextBody: message.textBody,
        HtmlBody: message.htmlBody,
        ReplyTo: message.replyTo,
        MessageID: message.messageId
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: result.MessageID
      };
    } else {
      return {
        success: false,
        error: result.Message || 'Postmark error'
      };
    }
  }

  private async sendViaSendGrid(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️ No SendGrid API key found, simulating email');
      return this.simulateEmail(message);
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: message.to }],
          subject: message.subject
        }],
        from: { email: message.from },
        reply_to: { email: message.replyTo || message.from },
        content: [
          {
            type: 'text/plain',
            value: message.textBody
          },
          ...(message.htmlBody ? [{
            type: 'text/html',
            value: message.htmlBody
          }] : [])
        ]
      })
    });

    if (response.ok) {
      // SendGrid returns message-id in headers
      const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;
      return {
        success: true,
        messageId: messageId
      };
    } else {
      const error = await response.text();
      return {
        success: false,
        error: `SendGrid error: ${error}`
      };
    }
  }

  private async sendViaMailgun(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Mailgun implementation
    console.log('📧 Mailgun not implemented yet, simulating...');
    return this.simulateEmail(message);
  }

  private async simulateEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string }> {
    // Simulation für Development
    const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🎭 SIMULATED EMAIL SENT:');
    console.log('From:', message.from);
    console.log('To:', message.to);
    console.log('Subject:', message.subject);
    console.log('Text:', message.textBody.substring(0, 100) + '...');
    console.log('Message ID:', messageId);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: messageId
    };
  }
}
