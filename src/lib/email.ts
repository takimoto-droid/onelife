import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// 送信元メールアドレス（Resendで認証済みのドメイン）
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// 登録完了メール送信
export async function sendWelcomeEmail(email: string): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured, skipping email to:', email);
    return true; // モックモードでは成功を返す
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '【わんサポ】会員登録が完了しました',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316;">🐶 わんサポ</h1>
          </div>

          <h2 style="color: #333;">会員登録が完了しました！</h2>

          <p>わんサポへようこそ！</p>

          <p>ご登録いただきありがとうございます。<br>
          これから愛犬との生活を全力でサポートいたします。</p>

          <div style="background: #fff7ed; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ea580c;">プレミアム機能をご利用いただけます</h3>
            <ul style="color: #666;">
              <li>AIドッグフードレシピ</li>
              <li>体重別ごはん量計算</li>
              <li>アレルギー管理</li>
              <li>AI健康アドバイス</li>
              <li>広告非表示</li>
            </ul>
          </div>

          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ーーーーーーーーーーーーーーーーー<br>
            わんサポ サポートチーム<br>
          </p>
        </body>
        </html>
      `,
    });

    console.log('Welcome email sent to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

// ログイン通知メール送信
export async function sendLoginNotificationEmail(email: string): Promise<boolean> {
  if (!resend) {
    console.log('Resend not configured, skipping login notification to:', email);
    return true;
  }

  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '【わんサポ】ログインしました',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316;">🐶 わんサポ</h1>
          </div>

          <h2 style="color: #333;">ログインしました</h2>

          <p>以下の日時にログインがありました。</p>

          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>日時:</strong> ${dateStr}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            心当たりがない場合は、すぐにパスワードを変更してください。
          </p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ーーーーーーーーーーーーーーーーー<br>
            わんサポ サポートチーム<br>
          </p>
        </body>
        </html>
      `,
    });

    console.log('Login notification sent to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send login notification:', error);
    return false;
  }
}
