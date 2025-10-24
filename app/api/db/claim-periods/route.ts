import { NextRequest, NextResponse } from 'next/server';
import { getAllClaimPeriods } from '@/lib/db';

/**
 * GET /api/db/claim-periods
 * Fetch all claim periods (active + closed) for the UI
 */
export async function GET(request: NextRequest) {
  try {
    const claimPeriods = await getAllClaimPeriods();

    return NextResponse.json(
      {
        success: true,
        claimPeriods,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching claim periods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claim periods', details: String(error) },
      { status: 500 }
    );
  }
}
