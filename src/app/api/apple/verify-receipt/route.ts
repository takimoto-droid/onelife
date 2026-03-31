import { NextRequest, NextResponse } from 'next/server';

// Demo mode - always return success
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    isPremium: true,
    message: 'Demo mode - premium enabled',
  });
}
