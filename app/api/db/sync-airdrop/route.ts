import { NextRequest, NextResponse } from 'next/server';
import { createAirdrop, getProofsByClaimPeriod, prisma } from '@/lib/db';

/**
 * POST /api/db/sync-airdrop
 * Called after an airdrop is executed on-chain
 * Syncs airdrop data (amount, subscriber count) to the database
 */
export async function POST(request: NextRequest) {
  try {
    const { claimPeriodId, creatorId, totalTokenAmount } = await request.json();

    // Validate input
    if (!claimPeriodId || !creatorId || totalTokenAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: claimPeriodId, creatorId, totalTokenAmount' },
        { status: 400 }
      );
    }

    // Get subscriber count from proofs
    const proofs = await getProofsByClaimPeriod(claimPeriodId);
    const subscriberCount = proofs.length;

    if (subscriberCount === 0) {
      return NextResponse.json(
        { error: 'No subscribers found for this claim period' },
        { status: 400 }
      );
    }

    // Create airdrop in database
    const airdrop = await createAirdrop(
      claimPeriodId,
      creatorId,
      totalTokenAmount.toString(),
      subscriberCount
    );

    // Mark claim period as closed
    await prisma.claimPeriod.update({
      where: { id: claimPeriodId },
      data: { isOpen: false, updatedAt: new Date() },
    });

    // Serialize BigInt fields to strings for JSON response
    const serializedAirdrop = {
      ...airdrop,
      totalTokenAmount: airdrop.totalTokenAmount.toString(),
      amountPerUser: airdrop.amountPerUser.toString(),
      claimPeriod: {
        ...airdrop.claimPeriod,
        startTime: airdrop.claimPeriod.startTime.toString(),
        endTime: airdrop.claimPeriod.endTime.toString(),
        claimPeriodId: airdrop.claimPeriod.claimPeriodId.toString(),
      },
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Airdrop synced successfully',
        airdrop: serializedAirdrop,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error syncing airdrop:', error);
    return NextResponse.json(
      { error: 'Failed to sync airdrop', details: String(error) },
      { status: 500 }
    );
  }
}
