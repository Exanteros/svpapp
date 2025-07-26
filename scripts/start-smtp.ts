#!/usr/bin/env tsx

import { startSMTPServer } from '../lib/smtp-server';

async function main() {
  console.log('🚀 Starting custom SMTP server...');
  
  const port = parseInt(process.env.SMTP_PORT || '2525');
  
  try {
    await startSMTPServer(port);
    
    console.log('📧 SMTP Server Configuration:');
    console.log(`   Port: ${port}`);
    console.log(`   Domain: ${process.env.TEAM_EMAIL_DOMAIN || 'email.rasenturnier.sv-puschendorf.de'}`);
    console.log('');
    console.log('📋 DNS Setup Required:');
    console.log(`   MX Record: ${process.env.TEAM_EMAIL_DOMAIN || 'email.rasenturnier.sv-puschendorf.de'} → your-server-ip`);
    console.log(`   A Record: mail.${process.env.TEAM_EMAIL_DOMAIN || 'email.rasenturnier.sv-puschendorf.de'} → your-server-ip`);
    console.log('');
    console.log('🔧 Test with:');
    console.log(`   telnet your-server-ip ${port}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping SMTP server...');
      process.exit(0);
    });
    
    // Keep alive
    setInterval(() => {
      // Just keep the process running
    }, 1000);
    
  } catch (error) {
    console.error('❌ Failed to start SMTP server:', error);
    process.exit(1);
  }
}

main().catch(console.error);