import { startSMTPServer } from './smtp-server';

// Start SMTP server when the application starts
export async function initializeEmailSystem() {
  try {
    console.log('🚀 Initializing email system...');
    
    // Start SMTP server on port 2525 (non-privileged port)
    await startSMTPServer(2525);
    
    console.log('✅ Email system initialized successfully');
    console.log('📧 Configure your MX record to point to this server on port 2525');
    console.log('📧 Or use port forwarding: iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525');
    
  } catch (error) {
    console.error('❌ Failed to initialize email system:', error);
    throw error;
  }
}

// Graceful shutdown
export function shutdownEmailSystem() {
  console.log('🛑 Shutting down email system...');
  // SMTP server will be closed automatically when process exits
}