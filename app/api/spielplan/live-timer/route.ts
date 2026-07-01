import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/dal';
import { deleteStoredLiveTimer, getStoredLiveTimers, saveStoredLiveTimer } from '@/lib/db';

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
    const { spielId, liveTime, status, startTime, elapsedTime, isSecondHalf, halbzeitStartTime } = await request.json();
    
    if (!spielId) {
      return NextResponse.json(
        { success: false, error: 'spielId is required' },
        { status: 400 }
      );
    }

    // Update live timer store - accept both 'running' and 'laufend' as valid statuses
    if (liveTime && (status === 'running' || status === 'laufend' || status === 'halftime' || status === 'halbzeit')) {
      const normalizedStatus = status === 'running' ? 'laufend' : status === 'halftime' ? 'halbzeit' : status;
      saveStoredLiveTimer(spielId, {
        liveTime,
        status: normalizedStatus,
        startTime,
        elapsedTime,
        isSecondHalf,
        halbzeitStartTime,
        lastUpdate: Date.now(),
      });
      
      console.log(`✅ Live timer updated for game ${spielId}: ${liveTime} (${status})`);
    } else if (status === 'beendet' || status === 'finished') {
      // Remove from live store when game ends
      deleteStoredLiveTimer(spielId);
      console.log(`🏁 Game ${spielId} finished, removed from live timer store`);
    } else {
      console.warn(`⚠️ Invalid status for live timer: ${status} (game ${spielId})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Live timer updated successfully'
    });

  } catch (error) {
    console.error('Error updating live timer:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      liveTimers: getStoredLiveTimers()
    });

  } catch (error) {
    console.error('Error fetching live timers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live timers' },
      { status: 500 }
    );
  }
}
