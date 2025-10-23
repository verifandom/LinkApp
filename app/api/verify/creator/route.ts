import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { sessionStore } from '@/lib/server/session-store';
import { generateCreatorProof } from '@/lib/reclaim/client';
import { z } from 'zod';

/**
 * POST /api/verify/creator
 *
 * Verifies creator ownership using Reclaim zk-fetch
 *
 * Request body:
 * {
 *   sessionId: string,     // OAuth session ID
 *   userAddress: string    // User's wallet address
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   channelId: string,
 *   channelTitle: string,
 *   subscriberCount: number,
 *   proof: any
 * }
 */

const VerifyCreatorRequestSchema = z.object({
  sessionId: z.string(),
  userAddress: z.string().startsWith('0x'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = VerifyCreatorRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error,
        },
        { status: 400 }
      );
    }

    const { sessionId, userAddress } = validationResult.data;

    const session = sessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: session.tokens.access_token,
        refresh_token: session.tokens.refresh_token,
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      const channelResponse = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });

      if (
        !channelResponse.data.items ||
        channelResponse.data.items.length === 0
      ) {
        return NextResponse.json(
          { success: false, error: 'No YouTube channel found' },
          { status: 404 }
        );
      }

      const channel = channelResponse.data.items[0];

      if (!channel.id) {
        throw Error('Error with channel id');
      }

      const proof = await generateCreatorProof(
        session.tokens.access_token,
        channel.id
      );

      return NextResponse.json({
        success: true,
        channelId: channel.id,
        channelTitle: channel.snippet?.title || 'Unknown',
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        proof,
      });
    } catch (error) {
      console.error('Error verifying creator:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to verify creator',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in verify-creator endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
