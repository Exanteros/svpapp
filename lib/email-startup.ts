import { startSMTPServer } from './smtp-server';

// Start SMTP server when the application starts
export async function initializeEmailSystem() {
  try {
    console.log('🚀 Initializing email system...');
    
    // Check if SMTP server is enabled
    if (process.env.ENABLE_SMTP_SERVER !== 'true') {
      console.log('📧 SMTP Server disabled via environment variable');
      return;
    }
    
    // Memory check for low-resource servers
    const totalMemory = process.memoryUsage();
    const memoryLimitMB = parseInt(process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1] || '512');
    
    if (totalMemory.heapUsed / 1024 / 1024 > memoryLimitMB * 0.7) {
      console.warn('⚠️ High memory usage detected. SMTP server may be resource-intensive.');
      console.log('💡 Consider disabling SMTP server in production with ENABLE_SMTP_SERVER=false');
    }
    
    // Start SMTP server on port 2525 (non-privileged port)
    await startSMTPServer(2525);
    
    console.log('✅ Email system initialized successfully');
    console.log('📧 Configure your MX record to point to this server on port 2525');
    console.log('📧 Or use port forwarding: iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525');
    
  } catch (error) {
    console.error('❌ Failed to initialize email system:', error);
    // Don't throw in production to prevent app crash
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Email system failed to start in production - continuing without it');
    } else {
      throw error;
    }
  }
}

// Graceful shutdown
export function shutdownEmailSystem() {
  console.log('🛑 Shutting down email system...');
  // SMTP server will be closed automatically when process exits
}