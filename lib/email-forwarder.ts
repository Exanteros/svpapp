import nodemailer from 'nodemailer';
import { getDatabase } from './database';
import { EmailService } from './email-service';

export class EmailForwarder {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create SMTP transporter for sending emails
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_OUT_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined,
      // For development/testing without auth
      ignoreTLS: process.env.NODE_ENV === 'development',
      requireTLS: false
    });
  }

  // Send email from team address
  async sendFromTeamEmail(
    teamEmailAddress: string,
    toEmail: string,
    subject: string,
    textBody: string,
    htmlBody?: string,
    inReplyTo?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📤 Sending email from team address:', {
        from: teamEmailAddress,
        to: toEmail,
        subject
      });

      const mailOptions = {
        from: teamEmailAddress,
        to: toEmail,
        subject: subject,
        text: textBody,
        html: htmlBody,
        inReplyTo: inReplyTo,
        references: inReplyTo
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send auto-reply
  async sendAutoReply(
    teamEmailAddress: string,
    originalSender: string,
    originalSubject: string,
    teamName: string
  ): Promise<void> {
    try {
      const db = getDatabase();
      const emailService = new EmailService(db);
      
      // Get auto-reply template
      const template = await emailService.getEmailTemplate('auto_reply');
      if (!template) {
        console.log('No auto-reply template found');
        return;
      }

      // Replace template variables
      const variables = {
        teamName: teamName,
        originalSubject: originalSubject,
        tournamentName: 'SVP Rasenturnier 2025'
      };

      const subject = emailService.replaceTemplateVariables(template.subject, variables);
      const bodyHtml = emailService.replaceTemplateVariables(template.body_html, variables);
      const bodyText = template.body_text 
        ? emailService.replaceTemplateVariables(template.body_text, variables)
        : undefined;

      await this.sendFromTeamEmail(
        teamEmailAddress,
        originalSender,
        subject,
        bodyText || bodyHtml.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        bodyHtml
      );

      console.log('✅ Auto-reply sent');

    } catch (error) {
      console.error('❌ Failed to send auto-reply:', error);
    }
  }

  // Test email configuration
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return { success: true };
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance
let emailForwarderInstance: EmailForwarder | null = null;

export function getEmailForwarder(): EmailForwarder {
  if (!emailForwarderInstance) {
    emailForwarderInstance = new EmailForwarder();
  }
  return emailForwarderInstance;
}