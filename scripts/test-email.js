#!/usr/bin/env node

const nodemailer = require('nodemailer');

// Test email sending to our SMTP server
async function testEmail() {
  const testEmail = process.argv[2] || 'svp-testteam-abc123@email.rasenturnier.sv-puschendorf.de';
  const fromEmail = process.argv[3] || 'test@example.com';
  const subject = process.argv[4] || 'Test Email from Script';
  const message = process.argv[5] || 'This is a test email to verify the SMTP server is working correctly.';

  console.log('📧 Sending test email...');
  console.log(`To: ${testEmail}`);
  console.log(`From: ${fromEmail}`);
  console.log(`Subject: ${subject}`);

  // Create transporter for our SMTP server
  const transporter = nodemailer.createTransporter({
    host: 'localhost',
    port: 2525,
    secure: false,
    auth: false,
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: testEmail,
      subject: subject,
      text: message,
      html: `<p>${message}</p>`
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('📨 Check your admin panel to see if the email appears in the team chat');
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.log('💡 Make sure the SMTP server is running (npm run dev:smtp)');
  }
}

if (require.main === module) {
  testEmail().catch(console.error);
}

module.exports = { testEmail };