-- Migration 006: Email System
-- Erstellt Tabellen für automatisches Email-Management mit randomisierten Team-Adressen

-- Team Email Adressen (randomisierte Emails pro Team)
CREATE TABLE IF NOT EXISTS team_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    email_address TEXT UNIQUE NOT NULL, -- z.B. svp-team-a7x9k2@example.com
    email_alias TEXT, -- Beschreibender Name
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (team_id) REFERENCES anmeldungen(id) ON DELETE CASCADE
);

-- Email Konversationen
CREATE TABLE IF NOT EXISTS email_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_email_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    thread_id TEXT, -- Für Email-Threading
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active', -- active, archived, spam
    message_count INTEGER DEFAULT 0,
    last_message_at DATETIME,
    FOREIGN KEY (team_email_id) REFERENCES team_emails(id) ON DELETE CASCADE
);

-- Einzelne Email Nachrichten
CREATE TABLE IF NOT EXISTS email_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    message_id TEXT UNIQUE, -- Eindeutige Email Message-ID
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT,
    body_html TEXT,
    direction TEXT NOT NULL, -- 'incoming', 'outgoing'
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    attachments_json TEXT, -- JSON Array von Attachment-Info
    raw_email_data TEXT, -- Vollständige Email für Debugging
    FOREIGN KEY (conversation_id) REFERENCES email_conversations(id) ON DELETE CASCADE
);

-- Email Templates für automatische Antworten
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    template_type TEXT NOT NULL, -- 'confirmation', 'welcome', 'reminder', 'custom'
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Logs für Email-Provider
CREATE TABLE IF NOT EXISTS email_webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL, -- 'postmark', 'sendgrid', 'mailgun', etc.
    webhook_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_team_emails_team_id ON team_emails(team_id);
CREATE INDEX IF NOT EXISTS idx_team_emails_email ON team_emails(email_address);
CREATE INDEX IF NOT EXISTS idx_conversations_team_email ON email_conversations(team_email_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON email_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON email_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON email_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON email_messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_read ON email_messages(is_read);

-- Standard Email Templates einfügen
INSERT OR IGNORE INTO email_templates (name, subject, body_html, body_text, template_type) VALUES 
(
    'team_confirmation',
    'Bestätigung Ihrer Anmeldung - {{teamName}}',
    '<h2>Herzlich willkommen!</h2>
    <p>Liebe/r {{teamName}},</p>
    <p>vielen Dank für Ihre Anmeldung zu unserem Turnier!</p>
    <p><strong>Ihre Anmeldedaten:</strong></p>
    <ul>
        <li>Team: {{teamName}}</li>
        <li>Kategorie: {{kategorie}}</li>
        <li>Anmeldedatum: {{anmeldedatum}}</li>
    </ul>
    <p>Bei Rückfragen antworten Sie einfach auf diese Email.</p>
    <p>Ihre Team-Kontakt-Email: <strong>{{teamEmail}}</strong></p>
    <p>Mit sportlichen Grüßen,<br>Das Organisationsteam</p>',
    'Herzlich willkommen!\n\nLiebe/r {{teamName}},\n\nvielen Dank für Ihre Anmeldung zu unserem Turnier!\n\nIhre Anmeldedaten:\n- Team: {{teamName}}\n- Kategorie: {{kategorie}}\n- Anmeldedatum: {{anmeldedatum}}\n\nBei Rückfragen antworten Sie einfach auf diese Email.\nIhre Team-Kontakt-Email: {{teamEmail}}\n\nMit sportlichen Grüßen,\nDas Organisationsteam',
    'confirmation'
),
(
    'auto_reply',
    'Re: {{originalSubject}}',
    '<p>Vielen Dank für Ihre Nachricht!</p>
    <p>Wir haben Ihre Email erhalten und werden uns so schnell wie möglich bei Ihnen melden.</p>
    <p>Diese Email-Adresse wird automatisch überwacht.</p>
    <p>Mit freundlichen Grüßen,<br>Das Organisationsteam</p>',
    'Vielen Dank für Ihre Nachricht!\n\nWir haben Ihre Email erhalten und werden uns so schnell wie möglich bei Ihnen melden.\n\nDiese Email-Adresse wird automatisch überwacht.\n\nMit freundlichen Grüßen,\nDas Organisationsteam',
    'auto_reply'
);
