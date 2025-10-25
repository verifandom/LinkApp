import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateCreatorProof,
  verifyReclaimProof,
  transformProofForOnchain,
} from '@/lib/reclaim/client';
import { createCreator } from '@/lib/db';

/**
 * POST /api/reclaim/generate-creator-proof
 *
 * Generates a Reclaim zk-fetch proof for YouTube creator ownership
 *
 * Request body:
 * {
 *   accessToken: string,           // Google OAuth access token
 *   channelId: string,              // YouTube channel ID being verified
 *   channelName?: string,           // Optional channel name
 *   tokenContractAddress?: string   // Optional Zora coin contract address (set after YouTube auth)
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

const GenerateCreatorProofSchema = z.object({
  accessToken: z.string(),
  channelId: z.string(),
  channelName: z.string().optional(),
  tokenContractAddress: z.string().startsWith('0x').optional(), // Zora coin contract address
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request schema
    const validationResult = GenerateCreatorProofSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error,
        },
        { status: 400 }
      );
    }

    const { accessToken, channelId, channelName, tokenContractAddress } =
      validationResult.data;

    try {
      const proof = await generateCreatorProof(accessToken, channelId);

      const onchainProof = transformProofForOnchain(proof);

      // Store creator and proof in database
      try {
        await createCreator(
          channelId,
          channelName || '',
          JSON.stringify(onchainProof),
          tokenContractAddress
        );
        console.log('Creator and proof stored in database');
      } catch (dbError) {
        console.error('Error storing creator in database:', dbError);
        // Continue even if DB storage fails
      }

      return NextResponse.json(
        {
          success: true,
          proof: {
            taskId: proof.taskId,
            ownerPublicKey: proof.ownerPublicKey,
          },
          onchainProof,
          message:
            'Creator verification successful. Proof generated and ready for on-chain submission.',
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error generating creator proof:', error);
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
    console.error('Error in generate-creator-proof endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
