import { OwnEmailSender } from './own-email-sender';

export class EmailSender {
  private sender: OwnEmailSender;

  constructor() {
    this.sender = new OwnEmailSender();
  }

  async sendEmail(emailData: {
    from: string;
    to: string;
    subject: string;
    textBody: string;
    htmlBody?: string;
    replyTo?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    console.log('📧 EmailSender.sendEmail called:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    });

    try {
      const result = await this.sender.sendEmail({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.textBody,
        html: emailData.htmlBody
      });
      
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const result = await this.sender.testConnection();
      return {
        connected: result,
        error: result ? undefined : 'Connection failed'
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
