import { NextRequest, NextResponse } from 'next/server';
import { createCreator } from '@/lib/db';

/**
 * POST /api/db/sync-creator
 * Called after a creator registers on-chain
 * Syncs creator data to the database
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, channelId, channelName } = await request.json();

    // Validate input
    if (!walletAddress || !channelId || !channelName) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, channelId, channelName' },
        { status: 400 }
      );
    }

    // Create or update creator in database
    const creator = await createCreator(walletAddress, channelId, channelName);

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
