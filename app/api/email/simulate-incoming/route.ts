import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';

// Simulate incoming emails for testing
export async function POST(request: NextRequest) {
  try {
    const { teamId, fromEmail, subject, message, senderName } = await request.json();

    if (!teamId || !fromEmail || !message) {
      return NextResponse.json(
        { success: false, error: 'teamId, fromEmail, and message are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const emailService = new EmailService(db);

    // Get or create team email
    let teamEmail = await emailService.getTeamEmail(teamId);
    
    if (!teamEmail) {
      // Create team email if it doesn't exist
      teamEmail = await emailService.createTeamEmail(teamId, `Team ${teamId}`);
    }

    console.log('📧 Simulating incoming email:', {
      to: teamEmail.email_address,
      from: fromEmail,
      subject: subject || 'Simulated Email'
    });

    // Process the simulated email
    const result = await emailService.processIncomingEmail(
      teamEmail.email_address,
      fromEmail,
      subject || 'Simulated Email',
      message,
      `<p>${message.replace(/\n/g, '<br>')}</p>`,
      `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      undefined,
      [],
      JSON.stringify({
        simulated: true,
        timestamp: new Date().toISOString(),
        senderName: senderName || 'Test Sender'
      })
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email simulated successfully',
        conversationId: result.conversationId,
        teamEmail: teamEmail.email_address
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error simulating email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to simulate email' },
      { status: 500 }
    );
  }
}

// GET endpoint to create test data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId') || '1';
    
    const db = getDatabase();
    const emailService = new EmailService(db);

    // Create test team email if it doesn't exist
    let teamEmail = await emailService.getTeamEmail(teamId);
    
    if (!teamEmail) {
      teamEmail = await emailService.createTeamEmail(teamId, `Test Team ${teamId}`);
    }

    // Create some test conversations
    const testEmails = [
      {
        from: 'coach@example.com',
        subject: 'Tournament Schedule',
        message: 'Hello team! Here is the updated tournament schedule for this weekend.'
      },
      {
        from: 'parent@example.com', 
        subject: 'Question about Equipment',
        message: 'Hi, I have a question about what equipment my child needs to bring.'
      },
      {
        from: 'organizer@tournament.com',
        subject: 'Important: Rule Changes',
        message: 'Please note the following rule changes that will be in effect for the tournament.'
      }
    ];

    const results = [];

    for (const email of testEmails) {
      const result = await emailService.processIncomingEmail(
        teamEmail.email_address,
        email.from,
        email.subject,
        email.message,
        `<p>${email.message}</p>`,
        `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        undefined,
        [],
        JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      );
      
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      message: 'Test emails created',
      teamEmail: teamEmail.email_address,
      results
    });

  } catch (error) {
    console.error('Error creating test emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create test emails' },
      { status: 500 }
    );
  }
}