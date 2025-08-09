import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';
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
    const conversationId = searchParams.get('conversationId');

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'teamId is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const emailService = new EmailService(db);

    if (conversationId) {
      // Hole Nachrichten einer spezifischen Konversation
      const messages = await emailService.getMessagesForConversation(parseInt(conversationId));
      
      // Markiere Nachrichten als gelesen
      await emailService.markMessagesAsRead(parseInt(conversationId));
      
      return NextResponse.json({ success: true, messages });
    } else {
      // Hole alle Konversationen für das Team
      const conversations = await emailService.getConversationsForTeam(teamId);
      return NextResponse.json({ success: true, conversations });
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teamId, subject, replyTo, message, isReply = false } = await request.json();

    if (!teamId || !message) {
      return NextResponse.json(
        { success: false, error: 'teamId and message are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const emailService = new EmailService(db);

    // Hole Team-Email
    const teamEmail = await emailService.getTeamEmail(teamId);
    if (!teamEmail) {
      return NextResponse.json(
        { success: false, error: 'Team email not found' },
        { status: 404 }
      );
    }

    let conversationId: number;

    if (isReply && replyTo) {
      // Antwort auf bestehende Konversation
      conversationId = parseInt(replyTo);
    } else {
      // Neue Konversation erstellen
      const conversation = await emailService.createConversation(
        teamEmail.id,
        subject || 'Neue Nachricht'
      );
      conversationId = conversation.id;
    }

    // Nachricht hinzufügen
    const emailMessage = await emailService.addMessageToConversation(
      conversationId,
      `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      teamEmail.email_address,
      'admin@turnier.example.com', // TODO: Admin-Email aus Config
      subject || 'Neue Nachricht',
      message,
      `<p>${message.replace(/\n/g, '<br>')}</p>`,
      'outgoing'
    );

    // TODO: Hier würde die Email tatsächlich versendet werden
    console.log('Would send email:', {
      from: teamEmail.email_address,
      to: 'admin@turnier.example.com',
      subject: subject || 'Neue Nachricht',
      body: message
    });

    return NextResponse.json({
      success: true,
      message: emailMessage,
      conversationId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
