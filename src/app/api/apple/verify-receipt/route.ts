import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Apple検証URL
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';

interface VerifyResult {
  valid: boolean;
  originalTransactionId?: string;
  productId?: string;
  purchaseDate?: Date;
  expiresDate?: Date;
  isTrialPeriod?: boolean;
  environment?: string;
}

// Appleレシート検証関数
async function verifyReceiptWithApple(receiptData: string): Promise<VerifyResult> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;

  if (!sharedSecret) {
    console.error('APPLE_SHARED_SECRET is not set');
    return { valid: false };
  }

  // まずProduction環境で検証
  let response = await fetch(APPLE_VERIFY_URL_PRODUCTION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: sharedSecret,
      'exclude-old-transactions': true,
    }),
  });

  let result = await response.json();

  // status 21007 = Sandbox用レシート → Sandboxで再検証
  if (result.status === 21007) {
    response = await fetch(APPLE_VERIFY_URL_SANDBOX, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData,
        password: sharedSecret,
        'exclude-old-transactions': true,
      }),
    });
    result = await response.json();
  }

  // 検証成功
  if (result.status === 0 && result.latest_receipt_info) {
    const latestTransaction = result.latest_receipt_info[0];

    return {
      valid: true,
      originalTransactionId: latestTransaction.original_transaction_id,
      productId: latestTransaction.product_id,
      purchaseDate: new Date(parseInt(latestTransaction.purchase_date_ms)),
      expiresDate: new Date(parseInt(latestTransaction.expires_date_ms)),
      isTrialPeriod: latestTransaction.is_trial_period === 'true',
      environment: result.environment,
    };
  }

  console.error('Apple receipt verification failed:', result.status);
  return { valid: false };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiptData } = await request.json();

    if (!receiptData) {
      return NextResponse.json({ error: 'Receipt data is required' }, { status: 400 });
    }

    // Appleにレシート検証リクエスト
    const verifyResult = await verifyReceiptWithApple(receiptData);

    if (!verifyResult.valid) {
      return NextResponse.json({ error: 'Invalid receipt' }, { status: 400 });
    }

    // ユーザーのプレミアム状態を更新
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        isPremium: true,
        appleOriginalTransactionId: verifyResult.originalTransactionId,
        appleSubscriptionStatus: 'active',
        appleExpiresAt: verifyResult.expiresDate,
        appleProductId: verifyResult.productId,
      },
    });

    // レシート履歴を保存
    await prisma.appleReceipt.upsert({
      where: { originalTransactionId: verifyResult.originalTransactionId! },
      create: {
        userId: user.id,
        originalTransactionId: verifyResult.originalTransactionId!,
        productId: verifyResult.productId!,
        purchaseDate: verifyResult.purchaseDate!,
        expiresDate: verifyResult.expiresDate,
        isTrialPeriod: verifyResult.isTrialPeriod ?? false,
        environment: verifyResult.environment!,
      },
      update: {
        expiresDate: verifyResult.expiresDate,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      isPremium: true,
      expiresAt: verifyResult.expiresDate,
      isTrialPeriod: verifyResult.isTrialPeriod,
    });
  } catch (error) {
    console.error('Receipt verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
