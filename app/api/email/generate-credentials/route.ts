import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
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
    const { teamName, domain } = body;
    
    if (!teamName) {
      return NextResponse.json({
        success: false,
        error: 'teamName is required'
      }, { status: 400 });
    }
    
    // Generate basic email credentials
    const sanitizedTeamName = teamName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const credentials = {
      email: `${sanitizedTeamName}@${domain || 'email.rasenturnier.sv-puschendorf.de'}`,
      username: sanitizedTeamName,
      password: generateRandomPassword(),
      smtp: {
        host: 'localhost',
        port: 587,
        secure: false
      },
      imap: {
        host: 'localhost',
        port: 993,
        secure: true
      }
    };
    
    return NextResponse.json({
      success: true,
      credentials,
      message: 'Email credentials generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating email credentials:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email credentials generation endpoint',
    methods: ['POST'],
    requiredFields: ['teamName'],
    optionalFields: ['domain']
  });
}

function generateRandomPassword(length = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}