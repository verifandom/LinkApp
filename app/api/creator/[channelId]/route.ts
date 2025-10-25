import { NextRequest, NextResponse } from 'next/server';
import { getCreatorByChannelId } from '@/lib/db';

/**
 * GET /api/creator/[channelId]
 *
 * Get creator information including YouTube channelId and Reclaim proof
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;

    console.log('GET /api/creator/[channelId] - channelId:', channelId);

    if (!channelId) {
      return NextResponse.json(
        { error: 'Invalid channel ID' },
        { status: 400 }
      );
    }

    const creator = await getCreatorByChannelId(channelId);

    console.log('Creator lookup result:', creator);

    if (!creator) {
      console.error('Creator not found for channelId:', channelId);
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      channelId: creator.channelId,
      channelName: creator.channelName,
      tokenContractAddress: creator.tokenContractAddress,
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
