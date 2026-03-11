import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// プレミアム機能の定義
const PREMIUM_FEATURES = {
  food: true,          // フード見直し
  aiRecipe: true,      // AIレシピ
  snsPost: true,       // SNS投稿文作成
  voiceTranslation: true, // 鳴き声翻訳
  community: true,     // ご近所コミュニティ
  // 以下は追加機能
  weightCalculator: true,
  allergyManagement: true,
  savedRecipes: true,
  healthAdvice: true,
  adFree: true,
};

const FREE_FEATURES = {
  food: false,
  aiRecipe: false,
  snsPost: false,
  voiceTranslation: false,
  community: false,
  weightCalculator: false,
  allergyManagement: false,
  savedRecipes: false,
  healthAdvice: false,
  adFree: false,
};

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
        stripeCustomerId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        trialStartDate: true,
        trialEndsAt: true,
        billingStartDate: true,
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
    let isTrialing = false;
    let isCanceling = false;

    if (user.appleSubscriptionStatus && user.appleSubscriptionStatus !== 'expired') {
      provider = 'apple';
      expiresAt = user.appleExpiresAt;
      status = user.appleSubscriptionStatus;
    } else if (user.subscriptionStatus && user.subscriptionStatus !== 'free' && user.subscriptionStatus !== 'canceled') {
      provider = 'stripe';
      expiresAt = user.nextBillingDate;
      status = user.subscriptionStatus;
      isTrialing = user.subscriptionStatus === 'trialing';
      isCanceling = user.subscriptionStatus === 'canceling';
    }

    // プレミアムかどうかの判定
    const isPremium = user.isPremium ||
      status === 'active' ||
      status === 'trialing' ||
      (user.appleSubscriptionStatus === 'active');

    return NextResponse.json({
      // 基本情報
      isPremium,
      provider,
      subscriptionStatus: status,

      // トライアル情報
      isTrialing,
      trialStartDate: user.trialStartDate,
      trialEndsAt: user.trialEndsAt,

      // 課金情報
      billingStartDate: user.billingStartDate,
      nextBillingDate: user.nextBillingDate,
      expiresAt,

      // 解約情報
      isCanceling,
      canceledAt: user.canceledAt,

      // プレミアム機能一覧
      features: isPremium ? PREMIUM_FEATURES : FREE_FEATURES,

      // プレミアム機能リスト（UI表示用）
      premiumFeatureList: [
        { id: 'food', name: 'フード見直し', icon: '🍽️' },
        { id: 'aiRecipe', name: 'AIレシピ', icon: '🍳' },
        { id: 'snsPost', name: 'SNS投稿文作成', icon: '📱' },
        { id: 'voiceTranslation', name: '鳴き声翻訳', icon: '🎤' },
        { id: 'community', name: 'ご近所コミュニティ', icon: '🐕' },
      ],
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
