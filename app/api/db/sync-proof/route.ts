import { NextRequest, NextResponse } from 'next/server';
import { createSubscriberProof, getProofsByClaimPeriod, prisma } from '@/lib/db';

/**
 * POST /api/db/sync-proof
 * Called after a subscriber registers on-chain with a proof
 * Syncs subscriber proof to the database
 */
export async function POST(request: NextRequest) {
  try {
    const { subscriberAddress, claimPeriodId, creatorId } = await request.json();

    // Validate input
    if (!subscriberAddress || !claimPeriodId || !creatorId) {
      return NextResponse.json(
        { error: 'Missing required fields: subscriberAddress, claimPeriodId, creatorId' },
        { status: 400 }
      );
    }

    // Create proof in database
    const proof = await createSubscriberProof(
      subscriberAddress,
      claimPeriodId,
      creatorId,
      new Date()
    );

    // Update subscriber count in airdrops table (if airdrop exists)
    const proofs = await getProofsByClaimPeriod(claimPeriodId);
    const proofCount = proofs.length;

    try {
      await prisma.airdrop.updateMany({
        where: { claimPeriodId },
        data: { subscriberCount: proofCount, updatedAt: new Date() },
      });
    } catch (error) {
      // Airdrop might not exist yet, that's fine
      console.log('No airdrop to update yet');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Proof synced successfully',
        proof,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error syncing proof:', error);
    return NextResponse.json(
      { error: 'Failed to sync proof', details: String(error) },
      { status: 500 }
    );
  }
}
