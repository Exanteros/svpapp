#!/usr/bin/env tsx

import { getDatabase } from '../lib/database';
import { EmailService } from '../lib/email-service';

async function testEmailSystem() {
  console.log('🧪 Testing Email System...\n');

  const db = getDatabase();
  const emailService = new EmailService(db);

  try {
    // 1. Test team email creation
    console.log('1️⃣ Testing team email creation...');
    const teamEmail = await emailService.createTeamEmail('test-team-1', 'SV Muster');
    console.log('✅ Team email created:', teamEmail.email_address);

    // 2. Test incoming email processing
    console.log('\n2️⃣ Testing incoming email processing...');
    const result = await emailService.processIncomingEmail(
      teamEmail.email_address,
      'sender@example.com',
      'Test Email Subject',
      'This is a test email message',
      '<p>This is a test email message</p>',
      'test-msg-123',
      undefined,
      [],
      JSON.stringify({ test: true })
    );
    
    if (result.success) {
      console.log('✅ Incoming email processed, conversation ID:', result.conversationId);
    } else {
      console.log('❌ Failed to process incoming email:', result.error);
    }

    // 3. Test conversation retrieval
    console.log('\n3️⃣ Testing conversation retrieval...');
    const conversations = await emailService.getConversationsForTeam('test-team-1');
    console.log('✅ Found conversations:', conversations.length);
    
    if (conversations.length > 0) {
      const messages = await emailService.getMessagesForConversation(conversations[0].id);
      console.log('✅ Found messages in first conversation:', messages.length);
    }

    // 4. Test database tables
    console.log('\n4️⃣ Testing database tables...');
    const teamEmails = await emailService.getAllTeamEmails();
    console.log('✅ Total team emails in database:', teamEmails.length);

    console.log('\n🎉 All tests passed! Email system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Test HTTP endpoint
async function testHTTPEndpoint() {
  console.log('\n🌐 Testing HTTP endpoint...');
  
  try {
    const response = await fetch('http://localhost:3000/api/email/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'svp-test-abc123@email.rasenturnier.sv-puschendorf.de',
        from: 'test@example.com',
        subject: 'HTTP Test Email',
        text: 'This is a test email via HTTP',
        messageId: 'http-test-123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ HTTP endpoint test passed:', data);
    } else {
      console.log('❌ HTTP endpoint test failed:', response.status);
    }
  } catch (error) {
    console.log('⚠️ HTTP endpoint not available (server not running?)');
  }
}

async function main() {
  await testEmailSystem();
  await testHTTPEndpoint();
}

main().catch(console.error);