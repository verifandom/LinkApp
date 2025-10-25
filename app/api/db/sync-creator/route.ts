import { NextRequest, NextResponse } from 'next/server';
import { createCreator } from '@/lib/db';

/**
 * POST /api/db/sync-creator
 * Called after a creator registers on-chain
 * Syncs creator data to the database
 */
export async function POST(request: NextRequest) {
  try {
    const { channelId, channelName, walletAddress, tokenContractAddress, reclaimProof } = await request.json();

    // Validate input
    if (!channelId || !channelName || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, channelName, walletAddress' },
        { status: 400 }
      );
    }

    // Create or update creator in database
    const creator = await createCreator(
      channelId,
      channelName,
      walletAddress,
      reclaimProof,
      tokenContractAddress
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Creator synced successfully',
        creator,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error syncing creator:', error);
    return NextResponse.json(
      { error: 'Failed to sync creator', details: String(error) },
      { status: 500 }
    );
  }
}
