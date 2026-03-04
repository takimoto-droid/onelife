'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

interface Activity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
}

interface FamilyData {
  familyId: string;
  members: FamilyMember[];
  inviteCode: string;
  maxMembers: number;
  recentActivities: Activity[];
}

export default function FamilyPage() {
  const { status } = useSession();
  const router = useRouter();
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      const fetchData = async () => {
        try {
          const res = await fetch('/api/family');
          if (res.ok) {
            const data = await res.json();
            setFamily(data);
          }
        } catch (error) {
          console.error('Failed to fetch family:', error);
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [status, router]);

  const fetchFamily = async () => {
    try {
      const res = await fetch('/api/family');
      if (res.ok) {
        const data = await res.json();
        setFamily(data);
      }
    } catch (error) {
      console.error('Failed to fetch family:', error);
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setInviteEmail('');
        setShowInviteModal(false);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to invite:', error);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;

    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setJoinCode('');
        setShowJoinModal(false);
        fetchFamily();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to join:', error);
    }
  };

  const copyInviteCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    return date.toLocaleDateString('ja-JP');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">家族共有</h2>
          <p className="text-dark-400">
            家族みんなでわんちゃんのお世話を共有
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-feature-health/10 border border-feature-health/30 rounded-lg text-feature-health text-center">
            {message}
          </div>
        )}

        {family && (
          <>
            {/* 招待コード */}
            <Card className="mb-6">
              <h3 className="font-bold text-dark-100 mb-3">招待コード</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-dark-700 rounded-lg px-4 py-3 font-mono text-2xl text-accent text-center tracking-wider">
                  {family.inviteCode}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInviteCode}
                  className="flex-shrink-0"
                >
                  {codeCopied ? '✓ コピー済み' : 'コピー'}
                </Button>
              </div>
              <p className="text-xs text-dark-400 mt-2">
                このコードを家族に共有して参加してもらいましょう
              </p>
            </Card>

            {/* メンバー */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-dark-100">
                  メンバー ({family.members.length}/{family.maxMembers})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                  disabled={family.members.length >= family.maxMembers}
                >
                  招待する
                </Button>
              </div>

              <div className="space-y-3">
                {family.members.map((member) => (
                  <Card key={member.id} variant="feature" className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-feature-family/20 flex items-center justify-center text-2xl">
                        {member.role === 'owner' ? '👑' : '👤'}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-dark-100">{member.name}</p>
                        <p className="text-sm text-dark-400">{member.email}</p>
                      </div>
                      <div className="text-xs text-dark-500">
                        {member.role === 'owner' ? 'オーナー' : 'メンバー'}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 最近のアクティビティ */}
            <div className="mb-6">
              <h3 className="font-bold text-dark-100 mb-4">最近のアクティビティ</h3>
              <div className="space-y-3">
                {family.recentActivities.map((activity) => (
                  <Card key={activity.id} variant="feature" className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-dark-100">{activity.action}</p>
                        <p className="text-sm text-dark-400">{activity.details}</p>
                      </div>
                      <p className="text-xs text-dark-500">
                        {formatTime(activity.timestamp)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 招待コードで参加 */}
            <Card variant="feature" className="mb-6">
              <h3 className="font-bold text-dark-100 mb-3">他の家族に参加する</h3>
              <p className="text-sm text-dark-400 mb-3">
                招待コードをお持ちですか？
              </p>
              <Button
                variant="secondary"
                onClick={() => setShowJoinModal(true)}
                className="w-full"
              >
                招待コードで参加
              </Button>
            </Card>
          </>
        )}

        {/* 注意書き */}
        <div className="disclaimer">
          <p>
            ※ 家族共有機能では、ワンちゃんの情報や散歩記録などを共有できます。
            招待コードは慎重に管理してください。
          </p>
        </div>
      </main>

      {/* 招待モーダル */}
      {showInviteModal && (
        <div className="modal-backdrop flex items-center justify-center" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-dark-100 mb-4">家族を招待</h3>
            <Input
              type="email"
              label="メールアドレス"
              placeholder="family@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowInviteModal(false)} className="flex-1">
                キャンセル
              </Button>
              <Button onClick={handleInvite} className="flex-1">
                招待を送信
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 参加モーダル */}
      {showJoinModal && (
        <div className="modal-backdrop flex items-center justify-center" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-dark-100 mb-4">招待コードで参加</h3>
            <Input
              type="text"
              label="招待コード"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-wider"
            />
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowJoinModal(false)} className="flex-1">
                キャンセル
              </Button>
              <Button onClick={handleJoin} className="flex-1">
                参加する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ボトムナビゲーション */}
      <nav className="bottom-nav">
        <div className="max-w-4xl mx-auto flex justify-around">
          <Link href="/dashboard" className="bottom-nav-item">
            <span className="text-xl">🏠</span>
            <span>ホーム</span>
          </Link>
          <Link href="/walk" className="bottom-nav-item">
            <span className="text-xl">🚶</span>
            <span>散歩</span>
          </Link>
          <Link href="/voice" className="bottom-nav-item">
            <span className="text-xl">🎤</span>
            <span>翻訳</span>
          </Link>
          <Link href="/family" className="bottom-nav-item bottom-nav-item-active">
            <span className="text-xl">👨‍👩‍👧</span>
            <span>家族</span>
          </Link>
          <Link href="/settings" className="bottom-nav-item">
            <span className="text-xl">⚙️</span>
            <span>設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
