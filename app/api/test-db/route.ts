import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/test-db
 * Test endpoint to check database schema
 */
export async function GET() {
  try {
    // Try to query with walletAddress field
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'creators'
      ORDER BY ordinal_position;
    `;

    return NextResponse.json({
      success: true,
      columns: result,
      message: 'Database schema check successful'
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
