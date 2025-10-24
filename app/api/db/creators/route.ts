import { NextRequest, NextResponse } from 'next/server';
import { getAllCreators } from '@/lib/db';

/**
 * GET /api/db/creators
 * Fetch all creators for the UI listing
 */
export async function GET(request: NextRequest) {
  try {
    const creators = await getAllCreators();

    return NextResponse.json(
      {
        success: true,
        creators,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators', details: String(error) },
      { status: 500 }
    );
  }
}
