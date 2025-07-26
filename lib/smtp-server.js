import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import Database from 'better-sqlite3';
import path from 'path';

class IntegratedSMTPServer {
  constructor(options = {}) {
    this.port = options.port || 25;
    this.hostname = options.hostname || '0.0.0.0';
    this.dbPath = options.dbPath || path.join(__dirname, '../database.sqlite');
    this.domain = options.domain || 'email.rasenturnier.sv-puschendorf.de';
    
    this.db = null;
    this.server = null;
    
    console.log('🚀 Initializing SMTP Server:', {
      port: this.port,
      hostname: this.hostname,
      domain: this.domain,
      dbPath: this.dbPath
    });
  }

  async start() {
    try {
      // Initialize database connection
      this.db = new Database(this.dbPath);
      console.log('📊 Database connected');

      // Create SMTP server
      this.server = new SMTPServer({
        // Allow all connections
        secure: false,
        authOptional: true,
        
        // Handle incoming connections
        onConnect: (session, callback) => {
          console.log('📧 SMTP Connection from:', session.remoteAddress);
          return callback(); // Accept all connections
        },

        // Handle authentication (optional)
        onAuth: (auth, session, callback) => {
          console.log('🔐 SMTP Auth attempt:', auth.username);
          return callback(null, { user: auth.username }); // Accept all auth
        },

        // Handle mail data
        onData: (stream, session, callback) => {
          console.log('📨 Receiving email data...');
          
          let rawEmail = '';
          
          stream.on('data', (chunk) => {
            rawEmail += chunk.toString();
          });
          
          stream.on('end', async () => {
            try {
              console.log('📧 Email received, parsing...');
              await this.processIncomingEmail(rawEmail, session);
              callback();
            } catch (error) {
              console.error('❌ Error processing email:', error);
              callback(new Error('Failed to process email'));
            }
          });
        }
      });

      // Start listening
      this.server.listen(this.port, this.hostname, () => {
        console.log(`✅ SMTP Server running on ${this.hostname}:${this.port}`);
        console.log(`📧 Ready to receive emails for domain: ${this.domain}`);
      });

      // Handle server errors
      this.server.on('error', (error) => {
        console.error('❌ SMTP Server error:', error);
      });

    } catch (error) {
      console.error('❌ Failed to start SMTP server:', error);
      throw error;
    }
  }

  async processIncomingEmail(rawEmail) {
    try {
      console.log('🔍 Parsing email...');
      
      // Parse the email
      const parsed = await simpleParser(rawEmail);
      
      const emailData = {
        to: parsed.to?.text || '',
        from: parsed.from?.text || '',
        subject: parsed.subject || 'No Subject',
        text: parsed.text || '',
        html: parsed.html || '',
        messageId: parsed.messageId || `smtp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        inReplyTo: parsed.inReplyTo || '',
        date: parsed.date || new Date(),
        attachments: parsed.attachments || []
      };

      console.log('📧 Parsed email:', {
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        messageId: emailData.messageId
      });

      // Extract recipient email addresses
      const recipients = this.extractRecipients(emailData.to);
      
      for (const recipient of recipients) {
        if (this.isTeamEmail(recipient)) {
          console.log(`📨 Processing team email: ${recipient}`);
          await this.saveTeamEmail(emailData, recipient);
        } else {
          console.log(`⚠️ Email not for team domain: ${recipient}`);
        }
      }

    } catch (error) {
      console.error('❌ Error processing incoming email:', error);
      throw error;
    }
  }

  extractRecipients(toField) {
    if (!toField) return [];
    
    // Extract email addresses from To field
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = toField.match(emailRegex) || [];
    
    return matches.map(email => email.toLowerCase().trim());
  }

  isTeamEmail(email) {
    return email.includes(this.domain) && email.includes('svp-');
  }

  async saveTeamEmail(emailData, recipientEmail) {
    try {
      // Find team email in database
      const teamEmailQuery = this.db.prepare('SELECT * FROM team_emails WHERE email_address = ? AND is_active = 1');
      const teamEmail = teamEmailQuery.get(recipientEmail);

      if (!teamEmail) {
        console.log(`⚠️ Team email not found in database: ${recipientEmail}`);
        return;
      }

      console.log(`✅ Found team email in database:`, teamEmail);

      // Find or create conversation
      let conversation = await this.findOrCreateConversation(teamEmail.id, emailData);

      // Save message
      await this.saveMessage(conversation.id, emailData, recipientEmail);

      console.log(`✅ Email saved for team: ${teamEmail.email_alias}`);

    } catch (error) {
      console.error('❌ Error saving team email:', error);
      throw error;
    }
  }

  async findOrCreateConversation(teamEmailId, emailData) {
    try {
      // Try to find existing conversation by subject or reply-to
      let conversation = null;

      if (emailData.inReplyTo) {
        const replyQuery = this.db.prepare(`
          SELECT ec.* FROM email_conversations ec
          JOIN email_messages em ON ec.id = em.conversation_id
          WHERE ec.team_email_id = ? AND em.message_id = ?
        `);
        conversation = replyQuery.get(teamEmailId, emailData.inReplyTo);
      }

      if (!conversation) {
        // Look for conversation with same subject
        const subjectQuery = this.db.prepare(`
          SELECT * FROM email_conversations 
          WHERE team_email_id = ? AND subject = ? AND status = 'active'
          ORDER BY updated_at DESC LIMIT 1
        `);
        conversation = subjectQuery.get(teamEmailId, emailData.subject);
      }

      if (!conversation) {
        // Create new conversation
        const insertConversation = this.db.prepare(`
          INSERT INTO email_conversations (team_email_id, subject, status, message_count, last_message_at)
          VALUES (?, ?, 'active', 0, CURRENT_TIMESTAMP)
        `);
        
        const result = insertConversation.run(teamEmailId, emailData.subject);
        
        const getConversation = this.db.prepare('SELECT * FROM email_conversations WHERE id = ?');
        conversation = getConversation.get(result.lastInsertRowid);
        
        console.log('📝 Created new conversation:', conversation.id);
      } else {
        console.log('📝 Using existing conversation:', conversation.id);
      }

      return conversation;

    } catch (error) {
      console.error('❌ Error finding/creating conversation:', error);
      throw error;
    }
  }

  async saveMessage(conversationId, emailData, recipientEmail) {
    try {
      // Save the message
      const insertMessage = this.db.prepare(`
        INSERT INTO email_messages 
        (conversation_id, message_id, from_email, to_email, subject, body_text, body_html, direction, is_read, raw_email_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'incoming', 0, ?)
      `);

      const attachmentsJson = emailData.attachments.length > 0 ? JSON.stringify(emailData.attachments) : null;
      
      insertMessage.run(
        conversationId,
        emailData.messageId,
        emailData.from,
        recipientEmail,
        emailData.subject,
        emailData.text,
        emailData.html,
        JSON.stringify(emailData)
      );

      // Update conversation
      const updateConversation = this.db.prepare(`
        UPDATE email_conversations 
        SET message_count = message_count + 1, 
            last_message_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateConversation.run(conversationId);

      console.log('✅ Message saved to conversation:', conversationId);

    } catch (error) {
      console.error('❌ Error saving message:', error);
      throw error;
    }
  }

  async stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('🛑 SMTP Server stopped');
      });
    }
    
    if (this.db) {
      this.db.close();
      console.log('📊 Database connection closed');
    }
  }
}

module.exports = { IntegratedSMTPServer };