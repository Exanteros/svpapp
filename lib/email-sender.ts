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

    return await this.sender.sendEmail(emailData);
  }

  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    return await this.sender.checkConnection();
  }
}
