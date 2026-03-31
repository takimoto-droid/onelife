import { NextRequest, NextResponse } from 'next/server';


import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    

    if (false) { // Auth removed
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { name, breed, birthDate, adoptedAt, dogSize } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'ワンちゃんの名前を入力してください' },
        { status: 400 }
      );
    }

    const dog = await prisma.dog.create({
      data: {
        userId: "demo-user",
        name,
        breed: breed || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        adoptedAt: adoptedAt ? new Date(adoptedAt) : null,
        dogSize: dogSize || null,
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
    

    if (false) { // Auth removed
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const dogs = await prisma.dog.findMany({
      where: { userId: "demo-user" },
      include: {
        vaccineSchedules: true,
      },
      orderBy: {
        createdAt: 'asc',
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
