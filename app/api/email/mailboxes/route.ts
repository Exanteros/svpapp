import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { EmailService } from '@/lib/email-service';
import { verifyApiAuth } from '@/lib/dal';

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { teamId, teamName } = await request.json();

    console.log('📧 Creating email mailbox for team:', { teamId, teamName });

    if (!teamId || !teamName) {
      return NextResponse.json(
        { success: false, error: 'teamId und teamName sind erforderlich' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const emailService = new EmailService(db);

    // Prüfe, ob Team bereits eine E-Mail hat
    const existingEmail = await emailService.getTeamEmail(teamId);
    if (existingEmail) {
      console.log('✅ Team hat bereits eine E-Mail:', existingEmail.email_address);
      return NextResponse.json({
        success: true,
        message: 'E-Mail-Postfach bereits vorhanden',
        teamEmail: existingEmail,
        status: 'existing'
      });
    }

    // Erstelle neue Team-E-Mail
    const teamEmail = await emailService.createTeamEmail(teamId, teamName);
    
    console.log('✅ Neues E-Mail-Postfach erstellt:', teamEmail.email_address);

    return NextResponse.json({
      success: true,
      message: 'E-Mail-Postfach erfolgreich erstellt',
      teamEmail: teamEmail,
      status: 'created',
      ready: true, // Postfach ist bereit für E-Mail-Empfang
      instructions: [
        'Das E-Mail-Postfach ist jetzt aktiv',
        `E-Mails an ${teamEmail.email_address} werden automatisch verarbeitet`,
        'Das Team kann über das Admin-Interface auf E-Mails zugreifen'
      ]
    });

  } catch (error) {
    console.error('❌ Error creating email mailbox:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Erstellen des E-Mail-Postfachs' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = getDatabase();
    const emailService = new EmailService(db);

    // Hole alle Team-E-Mails
    const teamEmails = await emailService.getAllTeamEmails();

    console.log('📊 Retrieved all team mailboxes:', teamEmails.length);

    return NextResponse.json({
      success: true,
      count: teamEmails.length,
      teamEmails: teamEmails.map(email => ({
        id: email.id,
        teamId: email.team_id,
        emailAddress: email.email_address,
        alias: email.email_alias,
        isActive: email.is_active,
        createdAt: email.created_at,
        ready: true // Alle Postfächer sind bereit
      })),
      domain: process.env.TEAM_EMAIL_DOMAIN,
      status: 'All mailboxes ready for incoming emails'
    });

  } catch (error) {
    console.error('❌ Error fetching mailboxes:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Abrufen der E-Mail-Postfächer' },
      { status: 500 }
    );
  }
}
