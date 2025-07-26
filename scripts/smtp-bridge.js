#!/usr/bin/env node

/**
 * SMTP-to-HTTP Bridge für SVP App
 * Empfängt SMTP-Emails und leitet sie an den HTTP-Webhook weiter
 */

const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const axios = require('axios');

class EmailBridge {
  constructor(webhookUrl = 'http://localhost:3000/api/email/receive', port = 2525) {
    this.webhookUrl = webhookUrl;
    this.port = port;
    this.setupServer();
  }

  setupServer() {
    this.server = new SMTPServer({
      // Authentifizierung deaktivieren für lokale Tests
      authOptional: true,
      
      // Erlaube alle Verbindungen
      onConnect: (session, callback) => {
        console.log(`📡 Neue Verbindung von: ${session.remoteAddress}`);
        callback(); // Akzeptiere Verbindung
      },

      // Prüfe Absender
      onMailFrom: (address, session, callback) => {
        console.log(`📤 Mail von: ${address.address}`);
        callback(); // Akzeptiere alle Absender
      },

      // Prüfe Empfänger
      onRcptTo: (address, session, callback) => {
        console.log(`📥 Mail an: ${address.address}`);
        
        // Akzeptiere nur Emails für unsere Domain
        if (address.address.includes('@email.rasenturnier.sv-puschendorf.de')) {
          console.log(`✅ Akzeptiere Email für: ${address.address}`);
          callback();
        } else {
          console.log(`❌ Lehne Email ab für: ${address.address}`);
          callback(new Error('Mailbox unavailable'));
        }
      },

      // Verarbeite Email-Daten
      onData: (stream, session, callback) => {
        this.handleEmailData(stream, session, callback);
      }
    });

    // Error Handling
    this.server.on('error', (err) => {
      console.error('❌ SMTP Server Fehler:', err);
    });
  }

  async handleEmailData(stream, session, callback) {
    try {
      console.log('\n📧 Verarbeite neue Email...');
      
      // Parse Email mit mailparser
      const parsed = await simpleParser(stream);
      
      const emailData = {
        to: session.envelope.rcptTo[0]?.address || '',
        from: session.envelope.mailFrom?.address || '',
        subject: parsed.subject || 'Kein Betreff',
        text: parsed.text || '',
        html: parsed.html || '',
        messageId: parsed.messageId,
        inReplyTo: parsed.inReplyTo,
        references: parsed.references,
        attachments: parsed.attachments?.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size
        })) || []
      };

      console.log(`Von: ${emailData.from}`);
      console.log(`An: ${emailData.to}`);
      console.log(`Betreff: ${emailData.subject}`);
      console.log(`Text: ${emailData.text?.substring(0, 100)}...`);

      // Sende an Webhook
      const response = await axios.post(this.webhookUrl, emailData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        console.log('✅ Webhook erfolgreich aufgerufen!');
        console.log(`Response:`, response.data);
        callback();
      } else {
        console.log(`❌ Webhook Fehler: ${response.status}`);
        callback(new Error('Webhook failed'));
      }

    } catch (error) {
      console.error('❌ Email Verarbeitung fehlgeschlagen:', error.message);
      callback(error);
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('🚀 SMTP-to-HTTP Bridge gestartet');
          console.log('='*50);
          console.log(`📡 SMTP Server: 0.0.0.0:${this.port}`);
          console.log(`🔗 Webhook URL: ${this.webhookUrl}`);
          console.log(`📧 Domain: email.rasenturnier.sv-puschendorf.de`);
          console.log('='*50);
          console.log('✅ Bereit für Email-Empfang!');
          console.log('Drücke Ctrl+C zum Beenden\n');
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('\n🛑 SMTP Server beendet');
        resolve();
      });
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const webhookUrl = args[0] || 'http://localhost:3000/api/email/receive';
  const port = parseInt(args[1]) || 2525;

  const bridge = new EmailBridge(webhookUrl, port);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutdown Signal empfangen...');
    await bridge.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Terminate Signal empfangen...');
    await bridge.stop();
    process.exit(0);
  });

  try {
    await bridge.start();
  } catch (error) {
    console.error('❌ Fehler beim Starten:', error.message);
    process.exit(1);
  }
}

// Starte wenn direkt ausgeführt
if (require.main === module) {
  main();
}

module.exports = EmailBridge;
