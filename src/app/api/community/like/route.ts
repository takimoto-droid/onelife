import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// いいねをトグル
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { error: '投稿IDが必要です' },
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

    // 既存のいいねを確認
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: session.user.id,
        },
      },
    });

    let isLiked: boolean;
    let newLikeCount: number;

    if (existingLike) {
      // いいねを取り消し
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });

      await prisma.communityPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });

      isLiked = false;
      newLikeCount = post.likeCount - 1;
    } else {
      // いいねを追加
      await prisma.postLike.create({
        data: {
          postId,
          userId: session.user.id,
        },
      });

      await prisma.communityPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });

      isLiked = true;
      newLikeCount = post.likeCount + 1;
    }

    return NextResponse.json({
      success: true,
      isLiked,
      likeCount: newLikeCount,
    });
  } catch (error) {
    console.error('Like toggle error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
