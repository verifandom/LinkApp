import { NextRequest, NextResponse } from 'next/server';
import { createClaimPeriod, getCreatorByChannelId } from '@/lib/db';

/**
 * POST /api/db/sync-claim-period
 * Called after a claim period is opened on-chain
 * Syncs claim period data to the database
 */
export async function POST(request: NextRequest) {
  try {
    const { channelId, claimPeriodId, startTime, endTime } = await request.json();

    // Validate input
    if (!channelId || claimPeriodId === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, claimPeriodId, startTime, endTime' },
        { status: 400 }
      );
    }

    // Get creator by channel ID
    const creator = await getCreatorByChannelId(channelId);
    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found for this channel' },
        { status: 404 }
      );
    }

    // Create claim period in database
    const claimPeriod = await createClaimPeriod(
      creator.id,
      channelId,
      BigInt(claimPeriodId),
      BigInt(startTime),
      BigInt(endTime),
      true // is_open = true when created
    );

    // Serialize BigInt fields to strings for JSON response
    const serializedClaimPeriod = {
      ...claimPeriod,
      startTime: claimPeriod.startTime.toString(),
      endTime: claimPeriod.endTime.toString(),
      claimPeriodId: claimPeriod.claimPeriodId.toString(),
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Claim period synced successfully',
        claimPeriod: serializedClaimPeriod,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error syncing claim period:', error);
    return NextResponse.json(
      { error: 'Failed to sync claim period', details: String(error) },
      { status: 500 }
    );
  }
}
