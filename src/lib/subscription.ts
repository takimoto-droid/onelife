import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// プレミアム機能の種類
export type PremiumFeature =
  | 'aiRecipe'           // AIドッグフードレシピ
  | 'weightCalculator'   // 体重別ごはん量計算
  | 'allergyManagement'  // アレルギー管理
  | 'savedRecipes'       // 保存レシピ無制限
  | 'healthAdvice'       // AI健康アドバイス
  | 'adFree';            // 広告非表示

// ユーザーがプレミアムかどうか確認
export async function isPremiumUser(email?: string): Promise<boolean> {
  if (!email) {
    const session = await getServerSession(authOptions);
    email = session?.user?.email ?? undefined;
  }

  if (!email) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { isPremium: true },
  });

  return user?.isPremium ?? false;
}

// ユーザーIDでプレミアム確認
export async function isPremiumUserById(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true },
  });

  return user?.isPremium ?? false;
}

// プレミアム機能が使えるか確認
export async function canUseFeature(feature: PremiumFeature, email?: string): Promise<boolean> {
  // 無料で使える機能はここに追加
  const freeFeatures: PremiumFeature[] = [];

  if (freeFeatures.includes(feature)) {
    return true;
  }

  return await isPremiumUser(email);
}

// プレミアムでない場合のエラーレスポンス
export function premiumRequiredResponse() {
  return {
    error: 'Premium required',
    message: 'この機能はプレミアムプランでご利用いただけます',
    upgradeUrl: '/premium',
  };
}

// 有効期限が近いかチェック（7日以内）
export async function isSubscriptionExpiringSoon(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      appleExpiresAt: true,
      nextBillingDate: true,
    },
  });

  if (!user) return false;

  const expiresAt = user.appleExpiresAt ?? user.nextBillingDate;
  if (!expiresAt) return false;

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return expiresAt <= sevenDaysFromNow;
}
