import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        isPremium: true,
        // Stripe
        subscriptionStatus: true,
        nextBillingDate: true,
        canceledAt: true,
        // Apple
        appleSubscriptionStatus: true,
        appleExpiresAt: true,
        appleProductId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // どの課金プロバイダーを使っているか判定
    let provider: 'apple' | 'stripe' | null = null;
    let expiresAt: Date | null = null;
    let status: string = 'free';

    if (user.appleSubscriptionStatus && user.appleSubscriptionStatus !== 'expired') {
      provider = 'apple';
      expiresAt = user.appleExpiresAt;
      status = user.appleSubscriptionStatus;
    } else if (user.subscriptionStatus && user.subscriptionStatus !== 'free' && user.subscriptionStatus !== 'canceled') {
      provider = 'stripe';
      expiresAt = user.nextBillingDate;
      status = user.subscriptionStatus;
    }

    return NextResponse.json({
      isPremium: user.isPremium,
      provider,
      status,
      expiresAt,
      // プレミアム機能一覧（UIで使用）
      features: user.isPremium
        ? {
            aiRecipe: true,
            weightCalculator: true,
            allergyManagement: true,
            savedRecipes: true,
            healthAdvice: true,
            adFree: true,
          }
        : {
            aiRecipe: false,
            weightCalculator: false,
            allergyManagement: false,
            savedRecipes: false,
            healthAdvice: false,
            adFree: false,
          },
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
