import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { name, breed, birthDate, adoptedAt } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'ワンちゃんの名前を入力してください' },
        { status: 400 }
      );
    }

    const dog = await prisma.dog.create({
      data: {
        userId: session.user.id,
        name,
        breed: breed || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        adoptedAt: adoptedAt ? new Date(adoptedAt) : null,
      },
    });

    return NextResponse.json({ dog });
  } catch (error) {
    console.error('Dog creation error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const dogs = await prisma.dog.findMany({
      where: { userId: session.user.id },
      include: {
        vaccineSchedules: true,
      },
    });

    return NextResponse.json({ dogs });
  } catch (error) {
    console.error('Dog fetch error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
