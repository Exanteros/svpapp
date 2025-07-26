import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { getDatabase } from './database';
import { EmailService } from './email-service';

export class CustomSMTPServer {
  private server: SMTPServer;
  private isRunning = false;

  constructor() {
    this.server = new SMTPServer({
      // Allow all connections
      secure: false,
      authOptional: true,
      disabledCommands: ['AUTH'],
      
      // Handle incoming emails
      onData: async (stream, session, callback) => {
        try {
          console.log('📧 Receiving email...');
          
          // Parse the email
          const parsed = await simpleParser(stream);
          
          console.log('📨 Email parsed:', {
            from: parsed.from?.text,
            to: parsed.to?.text,
            subject: parsed.subject
          });

          // Process the email
          await this.processIncomingEmail(parsed);
          
          callback();
        } catch (error) {
          console.error('❌ Error processing email:', error);
          callback(new Error('Failed to process email'));
        }
      },

      // Log connections
      onConnect: (session, callback) => {
        console.log('📡 SMTP connection from:', session.remoteAddress);
        callback();
      },

      // Handle errors
      onError: (error) => {
        console.error('❌ SMTP Server error:', error);
      }
    });
  }

  async start(port: number = 2525) {
    if (this.isRunning) {
      console.log('⚠️ SMTP server already running');
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.server.listen(port, (error) => {
        if (error) {
          console.error('❌ Failed to start SMTP server:', error);
          reject(error);
        } else {
          this.isRunning = true;
          console.log(`✅ SMTP Server running on port ${port}`);
          console.log(`📧 Ready to receive emails for *.email.rasenturnier.sv-puschendorf.de`);
          resolve();
        }
      });
    });
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    return new Promise<void>((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        console.log('🛑 SMTP Server stopped');
        resolve();
      });
    });
  }

  private async processIncomingEmail(parsed: any) {
    try {
      const db = getDatabase();
      const emailService = new EmailService(db);

      // Extract email addresses
      const toAddresses = this.extractEmailAddresses(parsed.to);
      const fromAddress = this.extractEmailAddresses(parsed.from)?.[0];

      if (!fromAddress) {
        console.log('❌ No from address found');
        return;
      }

      // Process each recipient (in case of multiple)
      for (const toAddress of toAddresses) {
        console.log(`📧 Processing email to: ${toAddress}`);

        // Check if this is a team email
        if (!toAddress.includes('@email.rasenturnier.sv-puschendorf.de')) {
          console.log(`⚠️ Email not for our domain: ${toAddress}`);
          continue;
        }

        // Process the email
        const result = await emailService.processIncomingEmail(
          toAddress,
          fromAddress,
          parsed.subject || 'Kein Betreff',
          parsed.text || '',
          parsed.html || '',
          parsed.messageId || `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          parsed.inReplyTo || '',
          parsed.attachments || [],
          JSON.stringify({
            headers: parsed.headers,
            date: parsed.date,
            messageId: parsed.messageId
          })
        );

        if (result.success) {
          console.log(`✅ Email processed successfully for ${toAddress}`);
        } else {
          console.error(`❌ Failed to process email for ${toAddress}:`, result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error in processIncomingEmail:', error);
    }
  }

  private extractEmailAddresses(addressField: any): string[] {
    if (!addressField) return [];
    
    if (typeof addressField === 'string') {
      return [addressField];
    }
    
    if (Array.isArray(addressField)) {
      return addressField.map(addr => 
        typeof addr === 'string' ? addr : addr.address || addr.text
      ).filter(Boolean);
    }
    
    if (addressField.address) {
      return [addressField.address];
    }
    
    if (addressField.text) {
      // Extract email from "Name <email@domain.com>" format
      const match = addressField.text.match(/<([^>]+)>/);
      return match ? [match[1]] : [addressField.text];
    }
    
    return [];
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let smtpServerInstance: CustomSMTPServer | null = null;

export function getSMTPServer(): CustomSMTPServer {
  if (!smtpServerInstance) {
    smtpServerInstance = new CustomSMTPServer();
  }
  return smtpServerInstance;
}

export async function startSMTPServer(port?: number): Promise<void> {
  const server = getSMTPServer();
  await server.start(port);
}

export async function stopSMTPServer(): Promise<void> {
  if (smtpServerInstance) {
    await smtpServerInstance.stop();
  }
}