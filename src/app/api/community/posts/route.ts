import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 匿名名を生成
async function generateAnonymousName(userId: string): Promise<string> {
  // ユーザーの犬の犬種を取得
  const dog = await prisma.dog.findFirst({
    where: { userId },
    select: { breed: true },
  });

  const breedNames: Record<string, string> = {
    '柴犬': '柴犬',
    'トイプードル': 'トイプー',
    'チワワ': 'チワワ',
    'ミニチュアダックスフンド': 'ダックス',
    'ポメラニアン': 'ポメ',
    'フレンチブルドッグ': 'フレブル',
    'ゴールデンレトリバー': 'ゴールデン',
    'ラブラドールレトリバー': 'ラブ',
    'コーギー': 'コーギー',
    'ビーグル': 'ビーグル',
    'シーズー': 'シーズー',
    'マルチーズ': 'マルチーズ',
    'ヨークシャーテリア': 'ヨーキー',
    'パグ': 'パグ',
    'ボーダーコリー': 'ボーダー',
  };

  const suffixes = ['飼い主', 'パパ', 'ママ', 'オーナー', 'さん'];
  const additions = ['＠近所', '＠ご近所', ''];

  const breedKey = dog?.breed || '';
  const breedName = breedNames[breedKey] || 'ワンコ';
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const addition = additions[Math.floor(Math.random() * additions.length)];

  return `${breedName}${suffix}${addition}`;
}

// 投稿一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const prefecture = searchParams.get('prefecture');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 条件を構築
    const where: Record<string, unknown> = {
      isHidden: false,
    };

    if (city) {
      where.city = city;
    }
    if (prefecture) {
      where.prefecture = prefecture;
    }
    if (category && category !== 'all') {
      where.category = category;
    }

    // 投稿を取得
    const posts = await prisma.communityPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        likes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    // ユーザーのいいね状態を追加
    const postsWithLikeStatus = posts.map(post => ({
      id: post.id,
      anonymousName: post.anonymousName,
      content: post.content,
      imageUrl: post.imageUrl,
      city: post.city,
      prefecture: post.prefecture,
      category: post.category,
      likeCount: post.likeCount,
      isLiked: post.likes.length > 0,
      createdAt: post.createdAt,
    }));

    const total = await prisma.communityPost.count({ where });

    return NextResponse.json({
      posts: postsWithLikeStatus,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// 投稿を作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { content, imageUrl, city, prefecture, category } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: '投稿内容を入力してください' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: '投稿は500文字以内にしてください' },
        { status: 400 }
      );
    }

    if (!city || !prefecture) {
      return NextResponse.json(
        { error: '位置情報が必要です' },
        { status: 400 }
      );
    }

    // 個人情報チェック（簡易）
    const personalInfoPatterns = [
      /\d{2,4}-\d{2,4}-\d{4}/, // 電話番号
      /\d{3}-\d{4}/, // 郵便番号
      /@\w+\.\w+/, // メールアドレス
    ];

    for (const pattern of personalInfoPatterns) {
      if (pattern.test(content)) {
        return NextResponse.json(
          { error: '個人情報を含む投稿はできません' },
          { status: 400 }
        );
      }
    }

    // 匿名名を生成
    const anonymousName = await generateAnonymousName(session.user.id);

    const post = await prisma.communityPost.create({
      data: {
        userId: session.user.id,
        anonymousName,
        content: content.trim(),
        imageUrl,
        city,
        prefecture,
        category: category || 'other',
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        anonymousName: post.anonymousName,
        content: post.content,
        imageUrl: post.imageUrl,
        city: post.city,
        prefecture: post.prefecture,
        category: post.category,
        likeCount: 0,
        isLiked: false,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
