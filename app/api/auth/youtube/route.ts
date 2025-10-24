import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/auth/youtube/start
 *
 * Generate a Google OAuth authorization URL with a unique session ID
 * Used by Farcaster Mini App to initiate YouTube OAuth flow
 *
 * Query params:
 * - type: 'creator' or 'user' (for context, optional)
 *
 * Response:
 * {
 *   authUrl: string,      // Full Google OAuth URL to open in browser
 *   sessionId: string     // Unique session ID for polling
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'user';

    // Generate unique session ID for this OAuth flow
    const sessionId = uuidv4();

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI || 'http://localhost:3000/api/oauth2callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Use state parameter to pass sessionId (OAuth standard)
    // Format: "type:sessionId" so we can extract both later
    const state = `${type}:${sessionId}`;

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state, // Pass sessionId in state parameter (OAuth standard)
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return NextResponse.json({ authUrl, sessionId });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
