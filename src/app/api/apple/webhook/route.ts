import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Apple Server-to-Server通知タイプ
type NotificationType =
  | 'INITIAL_BUY'           // 初回購入
  | 'DID_RENEW'             // 自動更新成功
  | 'DID_CHANGE_RENEWAL_STATUS' // 自動更新ON/OFF変更
  | 'DID_CHANGE_RENEWAL_PREF'   // プラン変更
  | 'EXPIRED'               // 有効期限切れ
  | 'DID_FAIL_TO_RENEW'     // 更新失敗（支払い問題）
  | 'GRACE_PERIOD_EXPIRED'  // 猶予期間終了
  | 'REFUND'                // 返金
  | 'REVOKE';               // ファミリー共有解除

interface AppleNotification {
  notification_type: NotificationType;
  unified_receipt?: {
    latest_receipt_info?: Array<{
      original_transaction_id: string;
      product_id: string;
      expires_date_ms: string;
      is_trial_period: string;
    }>;
  };
  // App Store Server Notifications V2
  signedPayload?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AppleNotification = await request.json();

    // V1形式の通知処理
    if (body.unified_receipt) {
      const latestReceipt = body.unified_receipt.latest_receipt_info?.[0];
      if (!latestReceipt) {
        console.log('No receipt info in notification');
        return NextResponse.json({ received: true });
      }

      const originalTransactionId = latestReceipt.original_transaction_id;

      // 該当ユーザーを検索
      const user = await prisma.user.findFirst({
        where: { appleOriginalTransactionId: originalTransactionId },
      });

      if (!user) {
        console.log(`User not found for transaction: ${originalTransactionId}`);
        return NextResponse.json({ received: true });
      }

      // 通知タイプごとの処理
      switch (body.notification_type) {
        case 'INITIAL_BUY':
        case 'DID_RENEW':
          // 購入・自動更新成功 → プレミアム継続
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isPremium: true,
              appleSubscriptionStatus: 'active',
              appleExpiresAt: new Date(parseInt(latestReceipt.expires_date_ms)),
            },
          });
          console.log(`Premium activated for user: ${user.id}`);
          break;

        case 'EXPIRED':
        case 'GRACE_PERIOD_EXPIRED':
        case 'REFUND':
        case 'REVOKE':
          // 期限切れ・返金・解除 → 無料に戻す
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isPremium: false,
              appleSubscriptionStatus: 'expired',
            },
          });
          console.log(`Premium expired for user: ${user.id}`);
          break;

        case 'DID_FAIL_TO_RENEW':
          // 支払い失敗 → 猶予期間中（まだプレミアム）
          await prisma.user.update({
            where: { id: user.id },
            data: {
              appleSubscriptionStatus: 'billing_retry',
            },
          });
          console.log(`Billing retry for user: ${user.id}`);
          break;

        case 'DID_CHANGE_RENEWAL_STATUS':
          // 自動更新ON/OFF変更（解約予約など）
          console.log(`Renewal status changed for user: ${user.id}`);
          break;

        default:
          console.log(`Unhandled notification type: ${body.notification_type}`);
      }

      return NextResponse.json({ received: true });
    }

    // V2形式の通知処理（signedPayload）
    if (body.signedPayload) {
      // TODO: JWTデコードして処理
      // App Store Server Notifications V2を使う場合は
      // signedPayloadをJWTデコードして処理する必要がある
      console.log('Received V2 notification (signedPayload)');
      return NextResponse.json({ received: true });
    }

    console.log('Unknown notification format');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Apple webhook error:', error);
    // Appleには常に200を返す（リトライを防ぐため）
    return NextResponse.json({ received: true });
  }
}
