import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// かかりつけ病院を取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const primaryClinic = await prisma.primaryVetClinic.findUnique({
      where: { userId: session.user.id },
      include: { clinic: true },
    });

    if (!primaryClinic) {
      return NextResponse.json({ clinic: null });
    }

    // 診療時間をパース
    let businessHours = null;
    if (primaryClinic.clinic.businessHours) {
      try {
        businessHours = JSON.parse(primaryClinic.clinic.businessHours);
      } catch {
        businessHours = null;
      }
    }

    return NextResponse.json({
      clinic: {
        ...primaryClinic.clinic,
        businessHours,
        registeredAt: primaryClinic.registeredAt,
        memo: primaryClinic.memo,
      },
    });
  } catch (error) {
    console.error('Get primary clinic error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// かかりつけ病院を登録
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      address,
      phone,
      latitude,
      longitude,
      businessHours,
      rating,
      reviewCount,
      googleMapsUrl,
      memo,
    } = body;

    if (!name || !address) {
      return NextResponse.json(
        { error: '病院名と住所は必須です' },
        { status: 400 }
      );
    }

    // 病院をDBに登録（または既存を取得）
    let clinic = await prisma.vetClinic.findFirst({
      where: { name, address },
    });

    if (!clinic) {
      clinic = await prisma.vetClinic.create({
        data: {
          name,
          address,
          phone,
          latitude,
          longitude,
          businessHours: businessHours ? JSON.stringify(businessHours) : null,
          rating,
          reviewCount,
          googleMapsUrl,
        },
      });
    }

    // 既存のかかりつけを削除して新規登録
    await prisma.primaryVetClinic.deleteMany({
      where: { userId: session.user.id },
    });

    const primaryClinic = await prisma.primaryVetClinic.create({
      data: {
        userId: session.user.id,
        clinicId: clinic.id,
        memo,
      },
      include: { clinic: true },
    });

    return NextResponse.json({
      success: true,
      clinic: {
        ...primaryClinic.clinic,
        businessHours: businessHours || null,
        registeredAt: primaryClinic.registeredAt,
        memo: primaryClinic.memo,
      },
    });
  } catch (error) {
    console.error('Register primary clinic error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// かかりつけ病院を解除
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    await prisma.primaryVetClinic.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete primary clinic error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
