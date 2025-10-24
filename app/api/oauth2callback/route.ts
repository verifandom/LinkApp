import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { sessionStore } from '@/lib/server/session-store';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/oauth2callback
 *
 * Handles Google OAuth callback
 * Exchanges auth code for tokens and stores session
 *
 * Query params:
 * - code: Authorization code from Google
 * - state: Verification type (creator/user)
 *
 * Redirects to frontend with sessionId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || 'user';
    const error = searchParams.get('error');

    // Handle user cancellation or errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${error}`, process.env.NEXT_PUBLIC_API_URL)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=no_code', process.env.NEXT_PUBLIC_API_URL)
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI || 'http://localhost:3000/oauth2callback'
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Generate session ID
    const sessionId = uuidv4();

    // Store session
    sessionStore.set(sessionId, {
      tokens: {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      type: state,
      createdAt: Date.now(),
    });

    // Redirect to frontend with session ID
    const redirectUrl = new URL('/', process.env.NEXT_PUBLIC_API_URL);
    redirectUrl.searchParams.set('sessionId', sessionId);
    redirectUrl.searchParams.set('type', state);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', process.env.NEXT_PUBLIC_API_URL)
    );
  }
}
