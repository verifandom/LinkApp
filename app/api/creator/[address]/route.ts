import { NextRequest, NextResponse } from 'next/server';
import { getCreator } from '@/lib/db';

/**
 * GET /api/creator/[address]
 *
 * Get creator information including YouTube channelId and Reclaim proof
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    if (!address || !address.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const creator = await getCreator(address);

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      walletAddress: creator.walletAddress,
      channelId: creator.channelId,
      channelName: creator.channelName,
      reclaimProof: creator.reclaimProof,
      registeredAt: creator.registeredAt,
    });
  } catch (error) {
    console.error('Error fetching creator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
