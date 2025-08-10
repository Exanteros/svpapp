import nodemailer from 'nodemailer';

export interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export class OwnEmailSender {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    try {
      // SMTP-Konfiguration aus Umgebungsvariablen
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      };

      this.transporter = nodemailer.createTransport(smtpConfig);
      
      console.log('📧 OwnEmailSender: SMTP-Transporter initialisiert');
    } catch (error) {
      console.error('❌ OwnEmailSender: Fehler beim Initialisieren des SMTP-Transporters:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ 
    success: boolean; 
    messageId?: string; 
    error?: string 
  }> {
    if (!this.transporter) {
      console.log('⚠️ OwnEmailSender: Kein SMTP-Transporter verfügbar - E-Mail wird simuliert');
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    try {
      console.log('📧 OwnEmailSender: Sende E-Mail...', {
        from: options.from,
        to: options.to,
        subject: options.subject
      });

      const result = await this.transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
      });

      console.log('✅ OwnEmailSender: E-Mail erfolgreich gesendet:', result.messageId);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: any) {
      console.error('❌ OwnEmailSender: Fehler beim Senden der E-Mail:', error);
      
      return {
        success: false,
        error: error.message || 'Unbekannter Fehler beim E-Mail-Versand',
      };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ OwnEmailSender: SMTP-Verbindung erfolgreich getestet');
      return true;
    } catch (error) {
      console.error('❌ OwnEmailSender: SMTP-Verbindungstest fehlgeschlagen:', error);
      return false;
    }
  }
}
