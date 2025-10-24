import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/server/session-store';

/**
 * GET /api/oauth/poll?sessionId=xxx
 *
 * Poll for OAuth session result
 * Used by Farcaster mini app to check if OAuth completed in external browser
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = sessionStore.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, pending: true },
        { status: 200 }
      );
    }

    // Return session data and delete it (one-time use)
    sessionStore.delete(sessionId);

    return NextResponse.json({
      success: true,
      accessToken: session.tokens.access_token,
      channelId: session.channelId,
      channelName: session.channelName,
    });
  } catch (error) {
    console.error('Error polling OAuth session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
