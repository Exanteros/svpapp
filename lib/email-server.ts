/**
 * Integrierter SMTP-Server für Next.js
 * Läuft automatisch mit der App und leitet Emails an die interne API weiter
 */

import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { EmailService } from '@/lib/email-service';
import { getDatabase } from '@/lib/database';

class IntegratedEmailServer {
  private server: SMTPServer | null = null;
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = 2525) {
    this.port = Number(port);
  }

  async start() {
    if (this.isRunning) {
      console.log('📧 SMTP Server bereits gestartet');
      return;
    }

    console.log('🚀 Starte integrierten SMTP-Server...');

    this.server = new SMTPServer({
      authOptional: true,
      secure: false,
      hideSTARTTLS: true,
      
      onConnect: (session, callback) => {
        console.log(`📡 SMTP Verbindung von: ${session.remoteAddress}`);
        callback();
      },

      onMailFrom: (address, session, callback) => {
        console.log(`📤 Mail von: ${address.address}`);
        callback();
      },

      onRcptTo: (address, session, callback) => {
        if (address.address.includes('@email.rasenturnier.sv-puschendorf.de')) {
          console.log(`✅ Akzeptiere: ${address.address}`);
          callback();
        } else {
          console.log(`❌ Ablehnung: ${address.address}`);
          callback(new Error('Mailbox nicht verfügbar'));
        }
      },

      onData: async (stream, session, callback) => {
        try {
          await this.processEmail(stream, session);
          callback();
        } catch (error) {
          console.error('❌ Email-Verarbeitung fehlgeschlagen:', error);
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });

    return new Promise<void>((resolve, reject) => {
      try {
        this.server!.listen(this.port);
        this.isRunning = true;
        console.log(`✅ SMTP Server läuft auf Port ${this.port}`);
        console.log(`📧 Bereit für Email-Empfang an *.email.rasenturnier.sv-puschendorf.de`);
        resolve();
      } catch (err) {
        console.error('❌ SMTP Server Start fehlgeschlagen:', err);
        reject(err);
      }
    });
  }

  async processEmail(stream: any, session: any) {
    const parsed = await simpleParser(stream);
    
    const emailData = {
      to: session.envelope.rcptTo[0]?.address || '',
      from: session.envelope.mailFrom?.address || '',
      subject: parsed.subject || 'Kein Betreff',
      text: parsed.text || '',
      html: parsed.html || '',
      messageId: parsed.messageId,
      inReplyTo: parsed.inReplyTo,
      attachments: parsed.attachments?.map((att: any) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      })) || []
    };

    console.log(`📧 Neue Email: ${emailData.from} → ${emailData.to}`);
    console.log(`📝 Betreff: ${emailData.subject}`);

    // Verarbeite direkt über EmailService (intern, kein HTTP)
    try {
      const db = getDatabase();
      const emailService = new EmailService(db);
      
      const result = await emailService.processIncomingEmail(
        emailData.to,
        emailData.from,
        emailData.subject,
        emailData.text,
        emailData.html,
        emailData.messageId,
        emailData.inReplyTo,
        emailData.attachments,
        JSON.stringify(emailData)
      );

      if (result.success) {
        console.log(`✅ Email verarbeitet → Konversation ${result.conversationId}`);
      } else {
        console.error(`❌ Email-Verarbeitung fehlgeschlagen: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Interne Email-Verarbeitung fehlgeschlagen:', error);
    }
  }

  async stop() {
    if (this.server && this.isRunning) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.isRunning = false;
          console.log('🛑 SMTP Server gestoppt');
          resolve();
        });
      });
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      port: this.port,
      domain: 'email.rasenturnier.sv-puschendorf.de'
    };
  }
}

// Singleton Instance
let emailServerInstance: IntegratedEmailServer | null = null;

export function getEmailServer(): IntegratedEmailServer {
  if (!emailServerInstance) {
    emailServerInstance = new IntegratedEmailServer(2525);
  }
  return emailServerInstance;
}

export async function startEmailServer() {
  const server = getEmailServer();
  await server.start();
  return server;
}

export async function stopEmailServer() {
  if (emailServerInstance) {
    await emailServerInstance.stop();
  }
}

export default IntegratedEmailServer;
