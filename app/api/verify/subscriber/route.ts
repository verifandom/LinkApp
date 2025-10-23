import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { sessionStore } from '@/lib/server/session-store';
import { generateSubscriberProof } from '@/lib/reclaim/client';
import { z } from 'zod';

/**
 * POST /api/verify/subscriber
 *
 * Verifies YouTube channel subscription using Reclaim zk-fetch
 *
 * Request body:
 * {
 *   sessionId: string,     // OAuth session ID
 *   userAddress: string,   // User's wallet address
 *   channelId: string      // YouTube channel ID to verify subscription for
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   channelId: string,
 *   proof: any
 * }
 */

const VerifySubscriberRequestSchema = z.object({
  sessionId: z.string(),
  userAddress: z.string().startsWith('0x'),
  channelId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = VerifySubscriberRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error,
        },
        { status: 400 }
      );
    }

    const { sessionId, channelId } = validationResult.data;
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
      const subscriptionResponse = await youtube.subscriptions.list({
        part: ['snippet'],
        mine: true,
        forChannelId: channelId,
        maxResults: 1,
      });

      const isSubscribed =
        subscriptionResponse.data.items &&
        subscriptionResponse.data.items.length > 0;

      if (!isSubscribed) {
        return NextResponse.json(
          { success: false, error: 'User is not subscribed to this channel' },
          { status: 400 }
        );
      }

      const proof = await generateSubscriberProof(
        session.tokens.access_token,
        channelId
      );

      return NextResponse.json({
        success: true,
        channelId,
        proof,
      });
    } catch (error) {
      console.error('Error verifying subscriber:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to verify subscription',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in verify-subscriber endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
