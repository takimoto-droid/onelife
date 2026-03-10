import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createCustomer } from '@/lib/stripe';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      );
    }

    // 既存ユーザーチェック
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // パスワードハッシュ化
    const hashedPassword = await hash(password, 12);

    // Stripeカスタマー作成（モックの場合はモックIDが返る）
    const stripeCustomerId = await createCustomer(email);

    // トライアル終了日（7日後）
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        stripeCustomerId: stripeCustomerId || undefined,
        subscriptionStatus: 'trialing',
        trialEndsAt,
        isPremium: true, // トライアル中はプレミアム
      },
    });

    // 登録完了メール送信（非同期で実行、エラーでも処理継続）
    sendWelcomeEmail(email).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    return NextResponse.json({
      message: '登録が完了しました',
      userId: user.id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '登録中にエラーが発生しました。しばらくしてからお試しください。' },
      { status: 500 }
    );
  }
}
