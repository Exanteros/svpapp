import { getDatabase } from '../lib/database';

/**
 * Setup-Script für Email-Templates
 * Erstellt die Standard-Email-Templates in der Datenbank
 */
async function setupEmailTemplates() {
  console.log('🔧 Email-Templates werden eingerichtet...');
  
  const db = getDatabase();
  
  // Lösche bestehende Templates
  db.prepare('DELETE FROM email_templates').run();
  
  // Team-Bestätigungs-Template
  const confirmationTemplate = {
    name: 'team_confirmation',
    subject: 'Willkommen bei {{tournamentName}} - Team {{teamName}}',
    body_html: `
      <h2>Willkommen bei {{tournamentName}}!</h2>
      <p>Hallo Team <strong>{{teamName}}</strong>,</p>
      
      <p>Ihre Team-Email-Adresse wurde erfolgreich erstellt:</p>
      <p><strong>{{emailAddress}}</strong></p>
      
      <p>Diese Email-Adresse ist ausschließlich für Ihr Team bestimmt und kann für alle turnierrelevanten Kommunikation verwendet werden.</p>
      
      <h3>Wichtige Hinweise:</h3>
      <ul>
        <li>Verwenden Sie diese Email-Adresse für Rückfragen zum Turnier</li>
        <li>Alle Nachrichten werden an unser Admin-Team weitergeleitet</li>
        <li>Sie erhalten Antworten direkt an diese Email-Adresse</li>
      </ul>
      
      <p>Wir freuen uns auf das Turnier mit Ihnen!</p>
      
      <p>Mit sportlichen Grüßen,<br>
      Das {{tournamentName}}-Team</p>
    `,
    body_text: `
Willkommen bei {{tournamentName}}!

Hallo Team {{teamName}},

Ihre Team-Email-Adresse wurde erfolgreich erstellt:
{{emailAddress}}

Diese Email-Adresse ist ausschließlich für Ihr Team bestimmt und kann für alle turnierrelevanten Kommunikation verwendet werden.

Wichtige Hinweise:
- Verwenden Sie diese Email-Adresse für Rückfragen zum Turnier
- Alle Nachrichten werden an unser Admin-Team weitergeleitet
- Sie erhalten Antworten direkt an diese Email-Adresse

Wir freuen uns auf das Turnier mit Ihnen!

Mit sportlichen Grüßen,
Das {{tournamentName}}-Team
    `,
    template_type: 'confirmation',
    is_active: true
  };
  
  // Auto-Reply-Template
  const autoReplyTemplate = {
    name: 'auto_reply',
    subject: 'Ihre Nachricht wurde empfangen - {{tournamentName}}',
    body_html: `
      <h2>Nachricht empfangen</h2>
      <p>Hallo {{senderName}},</p>
      
      <p>vielen Dank für Ihre Nachricht an {{teamName}}!</p>
      
      <p><strong>Betreff:</strong> {{originalSubject}}</p>
      
      <p>Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
      
      <p>Diese automatische Antwort bestätigt den Eingang Ihrer Nachricht. Bitte antworten Sie nicht auf diese Email.</p>
      
      <p>Mit freundlichen Grüßen,<br>
      Das {{tournamentName}}-Team</p>
    `,
    body_text: `
Nachricht empfangen

Hallo {{senderName}},

vielen Dank für Ihre Nachricht an {{teamName}}!

Betreff: {{originalSubject}}

Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.

Diese automatische Antwort bestätigt den Eingang Ihrer Nachricht. Bitte antworten Sie nicht auf diese Email.

Mit freundlichen Grüßen,
Das {{tournamentName}}-Team
    `,
    template_type: 'auto_reply',
    is_active: true
  };
  
  // Templates in Datenbank einfügen
  const insertStmt = db.prepare(`
    INSERT INTO email_templates (name, subject, body_html, body_text, template_type, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertStmt.run(
    confirmationTemplate.name,
    confirmationTemplate.subject,
    confirmationTemplate.body_html,
    confirmationTemplate.body_text,
    confirmationTemplate.template_type,
    1 // is_active as number
  );
  
  insertStmt.run(
    autoReplyTemplate.name,
    autoReplyTemplate.subject,
    autoReplyTemplate.body_html,
    autoReplyTemplate.body_text,
    autoReplyTemplate.template_type,
    1 // is_active as number
  );
  
  console.log('✅ Email-Templates erfolgreich erstellt:');
  console.log('  - team_confirmation (Bestätigungs-Email)');
  console.log('  - auto_reply (Automatische Antwort)');
  
  // Überprüfe erstellte Templates
  const templates = db.prepare('SELECT name, template_type FROM email_templates WHERE is_active = 1').all();
  console.log('📋 Aktive Templates:', templates);
}

// Script ausführen
if (require.main === module) {
  setupEmailTemplates()
    .then(() => {
      console.log('🎉 Email-Setup abgeschlossen!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fehler beim Email-Setup:', error);
      process.exit(1);
    });
}

export { setupEmailTemplates };
