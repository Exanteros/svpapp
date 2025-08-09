import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';
import { getTeamEmailDomain } from '@/lib/email-config';
import { verifyApiAuth } from '@/lib/dal';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    console.log('GET team-emails request:', { teamId });

    const db = getDatabase();
    const emailService = new EmailService(db);

    if (teamId) {
      // Hole Team-spezifische Email
      console.log('Looking for team email with teamId:', teamId);
      const teamEmail = await emailService.getTeamEmail(teamId);
      console.log('Found team email:', teamEmail);
      return NextResponse.json({ success: true, teamEmail });
    } else {
      // Hole alle Team-Emails (für Admin)
      const teamEmails = await emailService.getAllTeamEmails();
      return NextResponse.json({ success: true, teamEmails });
    }
  } catch (error) {
    console.error('Error fetching team emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team emails' },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { teamId, teamName, domain } = body;
    
    console.log('Team email creation request:', { teamId, teamName, domain, body });

    if (!teamId || !teamName) {
      console.log('Missing required fields:', { teamId: !!teamId, teamName: !!teamName });
      return NextResponse.json(
        { success: false, error: 'teamId and teamName are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const emailService = new EmailService(db);

    // Prüfe ob bereits Email existiert
    console.log('Checking for existing team email...');
    const existingEmail = await emailService.getTeamEmail(teamId);
    console.log('Existing email check result:', existingEmail);
    
    if (existingEmail) {
      console.log('Team email already exists, returning existing one');
      return NextResponse.json({
        success: true,
        teamEmail: existingEmail,
        message: 'Team email already exists'
      });
    }

    console.log('Creating new team email...');
    // Erstelle neue Team-Email
    const teamEmail = await emailService.createTeamEmail(
      teamId, 
      teamName, 
      domain || getTeamEmailDomain()
    );

    console.log('✅ Team-Email erfolgreich erstellt:', {
      teamId,
      teamName,
      emailAddress: teamEmail.email_address,
      domain: domain || getTeamEmailDomain()
    });

    // Sende Bestätigungs-Email
    await sendConfirmationEmail(emailService, teamEmail, teamName);

    return NextResponse.json({
      success: true,
      teamEmail,
      message: 'Team email created successfully'
    });
  } catch (error) {
    console.error('Error creating team email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create team email' },
      { status: 500 }
    );
  }
}

async function sendConfirmationEmail(emailService: EmailService, teamEmail: any, teamName: string) {
  try {
    // Hole Bestätigungs-Template
    const template = await emailService.getEmailTemplate('team_confirmation');
    if (!template) {
      console.log('No confirmation template found');
      return;
    }

    // Ersetze Variablen
    const variables = {
      teamName,
      emailAddress: teamEmail.email_address,
      tournamentName: 'SVP Turnier 2024'
    };

    const subject = emailService.replaceTemplateVariables(template.subject, variables);
    const bodyHtml = emailService.replaceTemplateVariables(template.body_html, variables);
    const bodyText = template.body_text 
      ? emailService.replaceTemplateVariables(template.body_text, variables)
      : undefined;

    // TODO: Hier würde der Email-Provider (Postmark, SendGrid, etc.) integriert
    console.log('Would send confirmation email:', {
      to: teamEmail.email_address,
      subject,
      bodyHtml,
      bodyText
    });

  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}
