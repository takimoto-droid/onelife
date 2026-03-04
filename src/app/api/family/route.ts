import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モックデータ: 家族メンバー
const MOCK_FAMILY_MEMBERS: Record<string, FamilyMember[]> = {};

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: string;
  avatar?: string;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 家族情報の取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // モック: 家族メンバー一覧
    const members = MOCK_FAMILY_MEMBERS[session.user.id] || [
      {
        id: session.user.id,
        name: session.user.email?.split('@')[0] || 'あなた',
        email: session.user.email || '',
        role: 'owner' as const,
        joinedAt: new Date().toISOString(),
      },
    ];

    // モック: 招待コード
    const inviteCode = generateInviteCode();

    return NextResponse.json({
      familyId: `family-${session.user.id}`,
      members,
      inviteCode,
      maxMembers: 5,
      recentActivities: [
        {
          id: '1',
          userId: session.user.id,
          action: '散歩を記録',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          details: '30分の散歩を完了',
        },
        {
          id: '2',
          userId: session.user.id,
          action: 'ワクチン予定を追加',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          details: '混合ワクチン',
        },
      ],
    });
  } catch (error) {
    console.error('Family API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// 家族への招待
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { email, inviteCode } = await request.json();

    // 招待コードで参加する場合
    if (inviteCode) {
      // モック: 招待コードの検証と家族への参加
      return NextResponse.json({
        success: true,
        message: '家族に参加しました',
        familyId: `family-invited`,
      });
    }

    // メールで招待する場合
    if (email) {
      // モック: 招待メール送信
      return NextResponse.json({
        success: true,
        message: `${email} に招待を送信しました`,
      });
    }

    return NextResponse.json(
      { error: 'メールアドレスまたは招待コードが必要です' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Family invite error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// 家族からの削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { memberId } = await request.json();

    // モック: メンバーの削除
    return NextResponse.json({
      success: true,
      message: 'メンバーを削除しました',
    });
  } catch (error) {
    console.error('Family delete error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
