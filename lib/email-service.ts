import Database from 'better-sqlite3';
import { getTeamEmailDomain } from './email-config';

interface TeamEmail {
  id: number;
  team_id: string;
  email_address: string;
  email_alias?: string;
  created_at: string;
  is_active: boolean;
}

interface EmailConversation {
  id: number;
  team_email_id: number;
  subject: string;
  thread_id?: string;
  created_at: string;
  updated_at: string;
  status: string;
  message_count: number;
  last_message_at?: string;
}

interface EmailMessage {
  id: number;
  conversation_id: number;
  message_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  direction: 'incoming' | 'outgoing';
  is_read: boolean;
  created_at: string;
  attachments_json?: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  template_type: string;
  is_active: boolean;
}

export class EmailService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Generiert eine randomisierte Email-Adresse für ein Team
  generateTeamEmail(teamName: string, domain?: string): string {
    // Erstelle eine kurze, randomisierte ID
    const randomId = this.generateRandomId(6);
    
    // Normalisiere Team-Namen für Email
    const normalizedTeam = teamName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 8);
    
    const emailDomain = domain || getTeamEmailDomain();
    return `svp-${normalizedTeam}-${randomId}@${emailDomain}`;
  }

  // Erstellt eine Team-Email automatisch bei Anmeldung
  async createTeamEmail(teamId: string, teamName: string, domain?: string): Promise<TeamEmail> {
    console.log('EmailService.createTeamEmail called with:', { teamId, teamName, domain });
    
    const emailAddress = this.generateTeamEmail(teamName, domain);
    const emailAlias = `Team ${teamName}`;

    console.log('Generated email details:', { emailAddress, emailAlias });

    try {
      const stmt = this.db.prepare(`
        INSERT INTO team_emails (team_id, email_address, email_alias, is_active)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(teamId, emailAddress, emailAlias, 1);
      console.log('Insert result:', result);
      
      const selectStmt = this.db.prepare('SELECT * FROM team_emails WHERE id = ?');
      const teamEmail = selectStmt.get(result.lastInsertRowid) as TeamEmail;
      
      console.log('Created team email:', teamEmail);
      return teamEmail;
    } catch (error) {
      console.error('Error in createTeamEmail:', error);
      throw error;
    }
  }

  // Hole Team-Email für ein Team
  async getTeamEmail(teamId: string): Promise<TeamEmail | null> {
    console.log('EmailService.getTeamEmail called with teamId:', teamId);
    
    try {
      const stmt = this.db.prepare('SELECT * FROM team_emails WHERE team_id = ? AND is_active = 1');
      const result = stmt.get(teamId) as TeamEmail || null;
      
      console.log('getTeamEmail result:', result);
      return result;
    } catch (error) {
      console.error('Error in getTeamEmail:', error);
      throw error;
    }
  }

  // Hole alle Team-Emails
  async getAllTeamEmails(): Promise<TeamEmail[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM team_emails
        WHERE is_active = 1
        ORDER BY created_at DESC
      `);
      return stmt.all() as TeamEmail[];
    } catch (error) {
      console.error('Error in getAllTeamEmails:', error);
      throw error;
    }
  }

  // Erstelle eine neue Email-Konversation
  async createConversation(teamEmailId: number, subject: string, threadId?: string): Promise<EmailConversation> {
    const stmt = this.db.prepare(`
      INSERT INTO email_conversations (team_email_id, subject, thread_id, status, message_count, last_message_at)
      VALUES (?, ?, ?, 'active', 0, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(teamEmailId, subject, threadId);
    
    const selectStmt = this.db.prepare('SELECT * FROM email_conversations WHERE id = ?');
    return selectStmt.get(result.lastInsertRowid) as EmailConversation;
  }

  // Füge Nachricht zu Konversation hinzu
  async addMessageToConversation(
    conversationId: number,
    messageId: string,
    fromEmail: string,
    toEmail: string,
    subject: string,
    bodyText?: string,
    bodyHtml?: string,
    direction: 'incoming' | 'outgoing' = 'incoming',
    attachments?: any[],
    rawEmailData?: string
  ): Promise<EmailMessage> {
    const attachmentsJson = attachments ? JSON.stringify(attachments) : null;
    
    const insertStmt = this.db.prepare(`
      INSERT INTO email_messages 
      (conversation_id, message_id, from_email, to_email, subject, body_text, body_html, direction, attachments_json, raw_email_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      conversationId, messageId, fromEmail, toEmail, subject, 
      bodyText, bodyHtml, direction, attachmentsJson, rawEmailData
    );

    // Update Konversation
    const updateStmt = this.db.prepare(`
      UPDATE email_conversations 
      SET message_count = message_count + 1, 
          last_message_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(conversationId);

    const selectStmt = this.db.prepare('SELECT * FROM email_messages WHERE id = ?');
    return selectStmt.get(result.lastInsertRowid) as EmailMessage;
  }

  // Hole Konversationen für ein Team
  async getConversationsForTeam(teamId: string): Promise<(EmailConversation & { teamEmail: TeamEmail; unreadCount: number })[]> {
    const stmt = this.db.prepare(`
      SELECT 
        ec.*,
        te.email_address,
        te.email_alias,
        COUNT(CASE WHEN em.is_read = 0 AND em.direction = 'incoming' THEN 1 END) as unread_count
      FROM email_conversations ec
      JOIN team_emails te ON ec.team_email_id = te.id
      LEFT JOIN email_messages em ON ec.id = em.conversation_id
      WHERE te.team_id = ? AND te.is_active = 1
      GROUP BY ec.id
      ORDER BY ec.updated_at DESC
    `);
    return stmt.all(teamId) as any[];
  }

  // Hole Nachrichten einer Konversation
  async getMessagesForConversation(conversationId: number): Promise<EmailMessage[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM email_messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `);
    return stmt.all(conversationId) as EmailMessage[];
  }

  // Markiere Nachrichten als gelesen
  async markMessagesAsRead(conversationId: number): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE email_messages 
      SET is_read = 1 
      WHERE conversation_id = ? AND direction = 'incoming'
    `);
    stmt.run(conversationId);
  }

  // Hole Email-Template
  async getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
    const stmt = this.db.prepare('SELECT * FROM email_templates WHERE name = ? AND is_active = 1');
    return stmt.get(templateName) as EmailTemplate || null;
  }

  // Template-Variablen ersetzen
  replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  // Generiere zufällige ID
  private generateRandomId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Verarbeite eingehende Email (Webhook)
  async processIncomingEmail(
    toEmail: string,
    fromEmail: string,
    subject: string,
    bodyText?: string,
    bodyHtml?: string,
    messageId?: string,
    inReplyTo?: string,
    attachments?: any[],
    rawEmailData?: string
  ): Promise<{ success: boolean; conversationId?: number; error?: string }> {
    try {
      // Finde Team-Email
      const teamEmail = await this.findTeamEmailByAddress(toEmail);
      if (!teamEmail) {
        return { success: false, error: 'Team email not found' };
      }

      // Finde oder erstelle Konversation
      let conversation: EmailConversation;
      
      if (inReplyTo) {
        // Versuche existierende Konversation zu finden
        const existingConversation = await this.findConversationByThreadId(inReplyTo);
        if (existingConversation) {
          conversation = existingConversation;
        } else {
          // Erstelle neue Konversation
          conversation = await this.createConversation(teamEmail.id, subject, inReplyTo);
        }
      } else {
        // Neue Konversation
        conversation = await this.createConversation(teamEmail.id, subject);
      }

      // Füge Nachricht hinzu
      await this.addMessageToConversation(
        conversation.id,
        messageId || this.generateRandomId(16),
        fromEmail,
        toEmail,
        subject,
        bodyText,
        bodyHtml,
        'incoming',
        attachments,
        rawEmailData
      );

      return { success: true, conversationId: conversation.id };
    } catch (error) {
      console.error('Error processing incoming email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Hilfsfunktionen
  async findTeamEmailByAddress(emailAddress: string): Promise<TeamEmail | null> {
    const stmt = this.db.prepare('SELECT * FROM team_emails WHERE email_address = ? AND is_active = 1');
    return stmt.get(emailAddress) as TeamEmail || null;
  }

  private async findConversationByThreadId(threadId: string): Promise<EmailConversation | null> {
    const stmt = this.db.prepare('SELECT * FROM email_conversations WHERE thread_id = ?');
    return stmt.get(threadId) as EmailConversation || null;
  }

  // Webhook-Log für Debugging
  async logWebhook(provider: string, webhookType: string, payload: any, processed: boolean = false, error?: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO email_webhook_logs (provider, webhook_type, payload_json, processed, error_message)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(provider, webhookType, JSON.stringify(payload), processed, error);
  }
}
