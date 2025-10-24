import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberProofs } from '@/lib/db';

/**
 * GET /api/db/my-airdrops?address=0x...
 * Fetch all airdrops a subscriber is participating in
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Missing required parameter: address' },
        { status: 400 }
      );
    }

    const proofs = await getSubscriberProofs(address);

    // Serialize BigInt fields to strings for JSON response
    const serializedProofs = proofs.map((proof) => ({
      ...proof,
      claimPeriod: {
        ...proof.claimPeriod,
        startTime: proof.claimPeriod.startTime.toString(),
        endTime: proof.claimPeriod.endTime.toString(),
        claimPeriodId: proof.claimPeriod.claimPeriodId.toString(),
      },
    }));

    return NextResponse.json(
      {
        success: true,
        airdrops: serializedProofs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user airdrops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user airdrops', details: String(error) },
      { status: 500 }
    );
  }
}
