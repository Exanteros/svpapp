// Email-Konfiguration für das SVP-Turnier
export const EMAIL_CONFIG = {
  // Subdomain für Team-Emails - kann über ENV überschrieben werden
  TEAM_EMAIL_DOMAIN: process.env.TEAM_EMAIL_DOMAIN || 'email.rasenturnier.sv-puschendorf.de',
  
  // Email-Provider-Konfiguration
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'sendgrid', // 'postmark' | 'sendgrid' | 'mailgun'
  
  // Admin-Email für Benachrichtigungen
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@sv-puschendorf.de',
  
  // From-Email für ausgehende Nachrichten
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@sv-puschendorf.de',
  
  // Postmark-Konfiguration
  POSTMARK: {
    SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    WEBHOOK_URL: process.env.POSTMARK_WEBHOOK_URL || '/api/email/webhooks/postmark'
  },
  
  // SendGrid-Konfiguration
  SENDGRID: {
    API_KEY: process.env.SENDGRID_API_KEY,
    WEBHOOK_URL: process.env.SENDGRID_WEBHOOK_URL || '/api/email/webhooks/sendgrid'
  },
  
  // Mailgun-Konfiguration
  MAILGUN: {
    API_KEY: process.env.MAILGUN_API_KEY,
    DOMAIN: process.env.MAILGUN_DOMAIN,
    WEBHOOK_URL: process.env.MAILGUN_WEBHOOK_URL || '/api/email/webhooks/mailgun'
  },
  
  // Template-Konfiguration
  TEMPLATES: {
    AUTO_REPLY_ENABLED: process.env.AUTO_REPLY_ENABLED === 'true',
    CONFIRMATION_ENABLED: process.env.CONFIRMATION_ENABLED !== 'false' // Default: true
  }
};

// Utility-Funktionen
export const getTeamEmailDomain = () => EMAIL_CONFIG.TEAM_EMAIL_DOMAIN;
export const getAdminEmail = () => EMAIL_CONFIG.ADMIN_EMAIL;
export const getFromEmail = () => EMAIL_CONFIG.FROM_EMAIL;
