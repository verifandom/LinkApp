import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateSubscriberProof,
  verifyReclaimProof,
  transformProofForOnchain,
} from '@/lib/reclaim/client';

/**
 * POST /api/reclaim/generate-subscriber-proof
 *
 * Generates a Reclaim zk-fetch proof for YouTube channel subscription
 *
 * Request body:
 * {
 *   accessToken: string,    // Google OAuth access token
 *   userAddress: string,    // User's wallet address
 *   channelId: string,      // YouTube channel ID
 *   channelName?: string    // Optional channel name
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   proof: ReclaimProof,
 *   onchainProof: any,      // Proof formatted for on-chain submission
 *   message: string
 * }
 */

const GenerateSubscriberProofSchema = z.object({
  accessToken: z.string(),
  userAddress: z.string().startsWith('0x'),
  channelId: z.string(),
  channelName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request schema
    const validationResult = GenerateSubscriberProofSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error,
        },
        { status: 400 }
      );
    }

    const { accessToken, userAddress, channelId, channelName } =
      validationResult.data;

    try {
      const proof = await generateSubscriberProof(accessToken, channelId);

      const isVerified = await verifyReclaimProof(proof);
      if (!isVerified) {
        return NextResponse.json(
          {
            success: false,
            error: 'Proof verification failed',
          },
          { status: 400 }
        );
      }

      const onchainProof = transformProofForOnchain(proof);

      return NextResponse.json(
        {
          success: true,
          proof: {
            taskId: proof.taskId,
            ownerPublicKey: proof.ownerPublicKey,
          },
          onchainProof,
          message:
            'Subscription verification successful. Proof generated and ready for on-chain submission.',
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error generating subscriber proof:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate proof',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in generate-subscriber-proof endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
