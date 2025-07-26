const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server for Next.js
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Start Next.js server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Next.js ready on http://${hostname}:${port}`);
    
    // Start SMTP server after Next.js is ready
    startSMTPServer();
  });
});

async function startSMTPServer() {
  try {
    // Dynamic import for ES modules
    const { startSMTPServer } = await import('./lib/smtp-server.js');
    
    const smtpPort = process.env.SMTP_PORT || 2525;
    await startSMTPServer(smtpPort);
    
    console.log('📧 Email system ready!');
    console.log('');
    console.log('📋 Setup Instructions:');
    console.log('1. Configure DNS:');
    console.log(`   MX Record: ${process.env.TEAM_EMAIL_DOMAIN || 'email.rasenturnier.sv-puschendorf.de'} → your-server-ip`);
    console.log('');
    console.log('2. Test email receiving:');
    console.log(`   Send email to: svp-test-abc123@${process.env.TEAM_EMAIL_DOMAIN || 'email.rasenturnier.sv-puschendorf.de'}`);
    console.log('');
    console.log('3. Or test locally:');
    console.log(`   curl -X POST http://localhost:${port}/api/email/receive \\`);
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"to":"svp-test-abc123@email.rasenturnier.sv-puschendorf.de","from":"test@example.com","subject":"Test","text":"Hello"}\'');
    
  } catch (error) {
    console.error('❌ Failed to start SMTP server:', error);
    console.log('📧 Continuing without SMTP server - you can still test with HTTP endpoints');
  }
}