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

    const body = await request.json();
    const {
      dogId,
      // 基本情報
      breed,
      birthDate,
      adoptedAt,
      dogSize,
      // ヒアリング結果
      hasDisease,
      diseaseDetail,
      visitFrequency,
      livingEnv,
      walkFrequency,
      isMultiDog,
      multiDogCount,
      anxietyLevel,
      // 見直しユーザー向け
      hasCurrentInsurance,
      currentInsuranceCost,
      insuranceConcern,
      // 旧フィールド（互換性）
      hasVisitedVet,
      mainConcern,
    } = body;

    if (!dogId) {
      return NextResponse.json(
        { error: '犬のIDが必要です' },
        { status: 400 }
      );
    }

    // 犬の情報を更新
    await prisma.dog.update({
      where: { id: dogId },
      data: {
        // 基本情報
        breed: breed || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        adoptedAt: adoptedAt ? new Date(adoptedAt) : null,
        dogSize: dogSize || null,
        // ヒアリング結果
        hasDisease: hasDisease ?? null,
        diseaseDetail: diseaseDetail || null,
        visitFrequency: visitFrequency || null,
        livingEnv: livingEnv || null,
        walkFrequency: walkFrequency || null,
        isMultiDog: isMultiDog ?? false,
        multiDogCount: multiDogCount || 1,
        anxietyLevel: anxietyLevel || null,
        // 見直しユーザー向け
        hasCurrentInsurance: hasCurrentInsurance ?? null,
        currentInsuranceCost: currentInsuranceCost || null,
        insuranceConcern: insuranceConcern || null,
        // 旧フィールド（互換性）
        hasVisitedVet: hasVisitedVet ?? null,
        mainConcern: mainConcern || null,
      },
    });

    // ユーザーのオンボーディングを完了にする
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboarded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hearing save error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
