import { NextRequest, NextResponse } from 'next/server';
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
    const body = await request.json();
    const { host, port, username, password, to, subject, text } = body;
    
    // Basic validation
    if (!host || !port || !to) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: host, port, to'
      }, { status: 400 });
    }
    
    // Simulate SMTP test (without actual sending for safety)
    const testResult = {
      success: true,
      host,
      port: parseInt(port),
      secure: port == 465,
      auth: !!username && !!password,
      recipient: to,
      subject: subject || 'SMTP Test Email',
      message: 'SMTP configuration test completed successfully',
      timestamp: new Date().toISOString(),
      simulated: true // Indicate this is a simulation
    };
    
    // Add some basic validation logic
    if (port && (port < 1 || port > 65535)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid port number'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      result: testResult,
      message: 'SMTP test completed successfully (simulated)'
    });
    
  } catch (error) {
    console.error('Error in SMTP test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'SMTP test endpoint',
    methods: ['POST'],
    requiredFields: ['host', 'port', 'to'],
    optionalFields: ['username', 'password', 'subject', 'text'],
    description: 'Test SMTP configuration without sending actual emails'
  });
}