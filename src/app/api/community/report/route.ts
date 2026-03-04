import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 通報を送信
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, reason, detail } = body;

    if (!postId) {
      return NextResponse.json(
        { error: '投稿IDが必要です' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: '通報理由を選択してください' },
        { status: 400 }
      );
    }

    // 投稿が存在するか確認
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 既に通報済みか確認
    const existingReport = await prisma.postReport.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: session.user.id,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'この投稿は既に通報済みです' },
        { status: 400 }
      );
    }

    // 通報を作成
    await prisma.postReport.create({
      data: {
        postId,
        userId: session.user.id,
        reason,
        detail,
      },
    });

    // 通報数を更新
    const updatedPost = await prisma.communityPost.update({
      where: { id: postId },
      data: { reportCount: { increment: 1 } },
    });

    // 通報が3件以上で自動非表示
    if (updatedPost.reportCount >= 3) {
      await prisma.communityPost.update({
        where: { id: postId },
        data: { isHidden: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: '通報を受け付けました。ご協力ありがとうございます。',
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// 通報理由の選択肢を取得
export async function GET() {
  const reasons = [
    { id: 'inappropriate', label: '不適切な内容' },
    { id: 'spam', label: 'スパム・宣伝' },
    { id: 'personal_info', label: '個人情報が含まれている' },
    { id: 'medical', label: '医療的なアドバイス' },
    { id: 'other', label: 'その他' },
  ];

  return NextResponse.json({ reasons });
}
