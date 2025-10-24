import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

/**
 * POST /api/db/init
 * Initialize the database schema (run this once on first deployment)
 * You can call this via curl or your admin dashboard
 *
 * Example:
 * curl -X POST https://your-app.vercel.app/api/db/init
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add security check here (e.g., check for an admin token)
    // const token = request.headers.get('authorization');
    // if (token !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await initializeDatabase();

    return NextResponse.json(
      {
        success: true,
        message: 'Database initialized successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    );
  }
}
