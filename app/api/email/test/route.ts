import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    console.log('=== EMAIL TEST API CALLED ===');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { teamId, teamName } = body;
    
    if (!teamId || !teamName) {
      console.log('Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'teamId and teamName are required'
      }, { status: 400 });
    }
    
    console.log('Getting database...');
    const db = getDatabase();
    console.log('Database obtained');
    
    console.log('Creating EmailService...');
    const emailService = new EmailService(db);
    console.log('EmailService created');
    
    console.log('Calling createTeamEmail...');
    const teamEmail = await emailService.createTeamEmail(
      teamId, 
      teamName, 
      'email.rasenturnier.sv-puschendorf.de'
    );
    
    console.log('Team email created successfully:', teamEmail);
    
    return NextResponse.json({
      success: true,
      teamEmail,
      message: 'Team email created successfully'
    });
    
  } catch (error) {
    console.error('Error in test email creation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
