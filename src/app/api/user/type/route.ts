import { NextRequest, NextResponse } from 'next/server';


import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    

    if (false) { // Auth removed
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { userType } = await request.json();

    if (!userType || !['new_owner', 'reviewing'].includes(userType)) {
      return NextResponse.json(
        { error: '無効なユーザータイプです' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: "demo-user" },
      data: { userType },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User type update error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    

    if (false) { // Auth removed
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: "demo-user" },
      select: { userType: true },
    });

    return NextResponse.json({ userType: user?.userType || null });
  } catch (error) {
    console.error('User type fetch error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
