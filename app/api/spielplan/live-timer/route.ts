import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/dal';

// In-memory store for live timer data (shared with live route)
// This would be better as a Redis store in production
let liveTimerStore: { [spielId: string]: { liveTime: string; status: string; lastUpdate: number } } = {};

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
    const { spielId, liveTime, status } = await request.json();
    
    if (!spielId) {
      return NextResponse.json(
        { success: false, error: 'spielId is required' },
        { status: 400 }
      );
    }

    // Update live timer store - accept both 'running' and 'laufend' as valid statuses
    if (liveTime && (status === 'running' || status === 'laufend' || status === 'halftime')) {
      liveTimerStore[spielId] = {
        liveTime,
        status: status === 'running' ? 'laufend' : status, // Normalize 'running' to 'laufend'
        lastUpdate: Date.now()
      };
      
      console.log(`✅ Live timer updated for game ${spielId}: ${liveTime} (${status})`);
    } else if (status === 'beendet' || status === 'finished') {
      // Remove from live store when game ends
      delete liveTimerStore[spielId];
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
    // Clean up old data (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    Object.keys(liveTimerStore).forEach(spielId => {
      if (liveTimerStore[spielId].lastUpdate < fiveMinutesAgo) {
        delete liveTimerStore[spielId];
      }
    });

    return NextResponse.json({
      success: true,
      liveTimers: liveTimerStore
    });

  } catch (error) {
    console.error('Error fetching live timers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live timers' },
      { status: 500 }
    );
  }
}
