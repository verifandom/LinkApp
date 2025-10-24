import { NextRequest, NextResponse } from 'next/server';
import { getAllClaimPeriods } from '@/lib/db';

/**
 * GET /api/db/claim-periods
 * Fetch all claim periods (active + closed) for the UI
 */
export async function GET(request: NextRequest) {
  try {
    const claimPeriods = await getAllClaimPeriods();

    // Convert BigInt values to strings for JSON serialization
    const serializedPeriods = claimPeriods.map((period) => ({
      ...period,
      startTime: period.startTime.toString(),
      endTime: period.endTime.toString(),
      claimPeriodId: period.claimPeriodId.toString(),
    }));
    console.log(serializedPeriods);

    return NextResponse.json(
      {
        success: true,
        claimPeriods: serializedPeriods,
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
