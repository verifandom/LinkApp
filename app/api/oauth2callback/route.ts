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

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get YouTube channel info
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      throw new Error('No YouTube channel found');
    }

    const channelId = channel.id || '';
    const channelName = channel.snippet?.title || '';

    // Return HTML that sends message to opener window
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .checkmark {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1>YouTube Connected!</h1>
            <p>You can close this window</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'youtube-auth-success',
                accessToken: '${tokens.access_token}',
                channelId: '${channelId}',
                channelName: '${channelName}'
              }, '*');
            }
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', process.env.NEXT_PUBLIC_API_URL)
    );
  }
}
