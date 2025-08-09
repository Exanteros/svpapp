import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';
import { getEmailForwarder } from '@/lib/email-forwarder';
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
    const { teamEmail, message, conversationId, isReply, toEmail, subject } = await request.json();

    if (!teamEmail || !message) {
      return NextResponse.json(
        { success: false, error: 'teamEmail and message are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const emailService = new EmailService(db);
    const emailForwarder = getEmailForwarder();

    let targetEmail = toEmail;
    let emailSubject = subject;
    let inReplyTo: string | undefined;

    if (isReply && conversationId) {
      // Get conversation details for reply
      const messages = await emailService.getMessagesForConversation(conversationId);
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        targetEmail = lastMessage.from_email;
        emailSubject = lastMessage.subject.startsWith('Re: ') 
          ? lastMessage.subject 
          : `Re: ${lastMessage.subject}`;
        inReplyTo = lastMessage.message_id;
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'No recipient email found' },
        { status: 400 }
      );
    }

    // Send the email
    const sendResult = await emailForwarder.sendFromTeamEmail(
      teamEmail,
      targetEmail,
      emailSubject || 'Nachricht vom Team',
      message,
      `<p>${message.replace(/\n/g, '<br>')}</p>`,
      inReplyTo
    );

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, error: sendResult.error },
        { status: 500 }
      );
    }

    // Save the outgoing message to database
    if (conversationId) {
      await emailService.addMessageToConversation(
        conversationId,
        sendResult.messageId || `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        teamEmail,
        targetEmail,
        emailSubject || 'Nachricht vom Team',
        message,
        `<p>${message.replace(/\n/g, '<br>')}</p>`,
        'outgoing'
      );
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}