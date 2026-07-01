import nodemailer from 'nodemailer';

// E-Mail-Konfiguration (für Entwicklung verwenden wir Ethereal)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal.pass'
  }
});

export interface EmailData {
  verein: string;
  kontakt: string;
  email: string;
  teams: {
    kategorie: string;
    anzahl: number;
    schiri: boolean;
    spielstaerke?: string;
  }[];
  kosten: number;
  anmeldungId: string;
}

export interface AdminInviteEmailData {
  email: string;
  name: string;
  inviteUrl: string;
  inviteExpiresAt: string;
}

export async function sendConfirmationEmail(data: EmailData) {
  const teamsList = data.teams.map(team => 
    `• ${team.kategorie}: ${team.anzahl} Team${team.anzahl > 1 ? 's' : ''} ${team.schiri ? '(mit Schiri)' : '(ohne Schiri, +20€)'} ${team.spielstaerke ? `- ${team.spielstaerke}` : ''}`
  ).join('\n');

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; border-radius: 8px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🏆 Anmeldung bestätigt!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Rasenturnier Puschendorf 2025</p>
        </div>
        
        <div style="padding: 30px; background: #f8fafc; border-radius: 8px; margin-top: 20px;">
          <h2 style="color: #1e293b; margin-top: 0;">Vielen Dank für Ihre Anmeldung, ${data.kontakt}!</h2>
          
          <p style="color: #475569; line-height: 1.6;">
            Ihre Anmeldung für das <strong>Rasenturnier Puschendorf 2025</strong> ist erfolgreich eingegangen.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin-top: 0;">📋 Anmeldungsdetails</h3>
            <p><strong>Verein:</strong> ${data.verein}</p>
            <p><strong>Anmeldungs-ID:</strong> ${data.anmeldungId}</p>
            <p><strong>Angemeldete Teams:</strong></p>
            <pre style="background: #f1f5f9; padding: 15px; border-radius: 4px; font-size: 14px; line-height: 1.5;">${teamsList}</pre>
            <p><strong>Gesamtkosten:</strong> <span style="color: #10b981; font-weight: bold;">${data.kosten}€</span></p>
          </div>
          
          <div style="background: #dbeafe; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">💳 Zahlungshinweise</h3>
            <p style="margin: 0; color: #1e40af;">
              Bitte überweisen Sie das Startgeld auf das Vereinskonto des SV Puschendorf:<br>
              <strong>Verwendungszweck:</strong> "Rasenturnier 2025, ${data.verein}, ${data.teams.length} Team${data.teams.length > 1 ? 's' : ''}"
            </p>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">📅 Turnier-Termine</h3>
            <p style="margin: 0; color: #92400e;">
              <strong>Samstag, 5. Juli 2025:</strong> 13:00 - 17:00 Uhr (Mini + E-Jugend)<br>
              <strong>Sonntag, 6. Juli 2025:</strong> 10:00 - 17:00 Uhr (D, C, B, A-Jugend)
            </p>
          </div>
          
          <p style="color: #475569; line-height: 1.6; margin-top: 30px;">
            Wir freuen uns auf ein spannendes Turnier mit Ihnen! Bei Fragen stehen wir Ihnen gerne zur Verfügung.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #64748b; font-size: 14px;">
              Mit sportlichen Grüßen,<br>
              <strong>Das Team des SV Puschendorf</strong>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Anmeldung bestätigt - Rasenturnier Puschendorf 2025

Vielen Dank für Ihre Anmeldung, ${data.kontakt}!

Ihre Anmeldung für das Rasenturnier Puschendorf 2025 ist erfolgreich eingegangen.

ANMELDUNGSDETAILS:
Verein: ${data.verein}
Anmeldungs-ID: ${data.anmeldungId}
Angemeldete Teams:
${teamsList}
Gesamtkosten: ${data.kosten}€

ZAHLUNGSHINWEISE:
Bitte überweisen Sie das Startgeld auf das Vereinskonto des SV Puschendorf:
Verwendungszweck: "Rasenturnier 2025, ${data.verein}, ${data.teams.length} Team${data.teams.length > 1 ? 's' : ''}"

TURNIER-TERMINE:
Samstag, 5. Juli 2025: 13:00 - 17:00 Uhr (Mini + E-Jugend)
Sonntag, 6. Juli 2025: 10:00 - 17:00 Uhr (D, C, B, A-Jugend)

Wir freuen uns auf ein spannendes Turnier mit Ihnen!

Mit sportlichen Grüßen,
Das Team des SV Puschendorf
`;

  try {
    const info = await transporter.sendMail({
      from: '"SV Puschendorf Rasenturnier" <noreply@sv-puschendorf.de>',
      to: data.email,
      subject: '🏆 Anmeldung bestätigt - Rasenturnier Puschendorf 2025',
      text: textContent,
      html: htmlContent
    });

    console.log('✅ E-Mail erfolgreich gesendet:', info.messageId);
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('❌ E-Mail-Versand fehlgeschlagen:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    };
  }
}

export async function sendAdminNotification(data: EmailData) {
  const teamsList = data.teams.map(team => 
    `• ${team.kategorie}: ${team.anzahl} Team${team.anzahl > 1 ? 's' : ''} ${team.schiri ? '(mit Schiri)' : '(ohne Schiri)'} ${team.spielstaerke ? `- ${team.spielstaerke}` : ''}`
  ).join('\n');

  try {
    const info = await transporter.sendMail({
      from: '"SV Puschendorf System" <system@sv-puschendorf.de>',
      to: process.env.ADMIN_EMAIL || 'admin@sv-puschendorf.de',
      subject: `🆕 Neue Anmeldung: ${data.verein}`,
      text: `
Neue Turnier-Anmeldung eingegangen!

Verein: ${data.verein}
Kontakt: ${data.kontakt}
E-Mail: ${data.email}
Anmeldungs-ID: ${data.anmeldungId}

Teams:
${teamsList}

Gesamtkosten: ${data.kosten}€
      `,
      html: `
        <h2>🆕 Neue Turnier-Anmeldung</h2>
        <p><strong>Verein:</strong> ${data.verein}</p>
        <p><strong>Kontakt:</strong> ${data.kontakt}</p>
        <p><strong>E-Mail:</strong> ${data.email}</p>
        <p><strong>Anmeldungs-ID:</strong> ${data.anmeldungId}</p>
        <p><strong>Teams:</strong></p>
        <pre>${teamsList}</pre>
        <p><strong>Gesamtkosten:</strong> ${data.kosten}€</p>
      `
    });

    console.log('✅ Admin-Benachrichtigung gesendet:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Admin-Benachrichtigung fehlgeschlagen:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
  }
}

export async function sendAdminInviteEmail(data: AdminInviteEmailData) {
  const expiresAt = formatInviteDate(data.inviteExpiresAt);
  const recipientName = data.name || data.email;
  const textContent = `
Hallo ${recipientName},

du wurdest als Admin für die SV Puschendorf Turnier-Verwaltung eingeladen.

Bitte öffne diesen Link im Browser und richte deinen Passkey ein:
${data.inviteUrl}

Der Link ist gültig bis ${expiresAt}.

Nach der Einrichtung kannst du dich über /admin/login per Passkey anmelden.

Viele Grüße
SV Puschendorf
`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #1f2933;">
      <h1 style="font-size: 22px; margin: 0 0 16px;">Admin-Zugang einrichten</h1>
      <p>Hallo ${escapeHtml(recipientName)},</p>
      <p>du wurdest als Admin für die SV Puschendorf Turnier-Verwaltung eingeladen.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(data.inviteUrl)}" style="display: inline-block; background: #5e6d35; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Passkey einrichten
        </a>
      </p>
      <p style="font-size: 14px; color: #52616b;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #52616b;">${escapeHtml(data.inviteUrl)}</p>
      <p style="font-size: 14px; color: #52616b;">Gültig bis ${escapeHtml(expiresAt)}.</p>
      <p>Viele Grüße<br />SV Puschendorf</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"SV Puschendorf Verwaltung" <noreply@sv-puschendorf.de>',
      to: data.email,
      subject: 'Admin-Zugang für SV Puschendorf einrichten',
      text: textContent,
      html: htmlContent,
    });

    console.log('✅ Admin-Einladung gesendet:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  } catch (error) {
    console.error('❌ Admin-Einladung fehlgeschlagen:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

function formatInviteDate(value: string) {
  try {
    return new Date(value).toLocaleString('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
