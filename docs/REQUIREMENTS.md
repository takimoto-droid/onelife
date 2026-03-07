# わんライフ - 要件定義書

## 1. プロジェクト概要

### 1.1 アプリ名
**わんライフ（Wan Life）**

### 1.2 コンセプト
犬を飼い始めた人の不安を減らし、ワクチン・保険などのタスクを忘れさせない「AI相棒アプリ」

### 1.3 ターゲットユーザー
| タイプ | 説明 |
|--------|------|
| 新規飼い主 | 犬を飼い始めたばかりの人 |
| 見直し層 | すでに飼っていて保険や生活を見直したい人 |
| 検討中 | これから犬を飼いたい人 |

### 1.4 ビジネスモデル
- **無料プラン**: 基本機能（ワクチン管理、散歩、コミュニティ等）
- **プレミアム**: 月額500円（7日間無料トライアル）
  - AI鳴き声翻訳
  - AIフード見直し
  - AIレシピ生成

---

## 2. 技術スタック

### 2.1 フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 14.2.35 | Reactフレームワーク |
| React | 18.3.1 | UIライブラリ |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 3.4.19 | スタイリング |

### 2.2 バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js API Routes | 14.x | RESTful API |
| Prisma | 5.22.0 | ORM |
| SQLite | - | データベース（MVP） |

### 2.3 外部サービス
| サービス | 用途 |
|----------|------|
| OpenAI API | AI機能（GPT-4o-mini） |
| Stripe | 決済・サブスクリプション |
| NextAuth.js | 認証 |

---

## 3. 使用API一覧

### 3.1 認証API
```
POST /api/auth/register     - 会員登録（Stripeカスタマー作成含む）
POST /api/auth/[...nextauth] - NextAuth認証ハンドラー
```

### 3.2 犬・ユーザー管理API
```
GET/POST /api/dogs          - 犬の登録・取得
PUT /api/user/type          - ユーザータイプ設定
```

### 3.3 健康管理API
```
POST /api/vaccine/generate       - ワクチンスケジュール自動生成
POST /api/vaccine/[id]/complete  - ワクチン完了マーク
POST /api/hearing/save           - ヒアリング結果保存
POST /api/ai/hearing             - AIヒアリング分析
POST /api/ai/insurance           - AI保険レコメンド
```

### 3.4 獣医・施設API
```
GET /api/vet/primary        - かかりつけ獣医取得
POST /api/vet/primary       - かかりつけ獣医設定
GET /api/vet/search         - 獣医検索
GET /api/places/nearby      - 周辺施設検索
```

### 3.5 散歩API
```
POST /api/walk/start        - 散歩開始
POST /api/walk/end          - 散歩終了・履歴保存
GET /api/walk/history       - 散歩履歴取得
GET /api/walk/route         - ルート取得
GET /api/walk/route/detailed - 詳細ルート情報
```

### 3.6 コミュニティAPI
```
GET/POST /api/community/posts - 投稿一覧・作成
POST /api/community/like      - いいね
POST /api/community/report    - 通報
```

### 3.7 AI機能API
```
POST /api/voice/translate   - 鳴き声翻訳（Premium）
POST /api/recipe/generate   - レシピ生成
GET/POST /api/recipe/saved  - 保存レシピ管理
POST /api/sns/generate      - SNS投稿文生成
POST /api/food/recommend    - フードレコメンド（Premium）
```

### 3.8 イベント・グッズAPI
```
GET /api/events             - イベント一覧
GET /api/events/enhanced    - 詳細イベント情報
GET /api/goods              - おすすめグッズ
```

### 3.9 決済API
```
POST /api/stripe/create-checkout - チェックアウトセッション作成
POST /api/stripe/webhook         - Stripe Webhook処理
POST /api/stripe/cancel          - サブスク解約
```

---

## 4. 高速レンダリングの理由

### 4.1 Next.js 14 App Router

```
【従来のPages Router】
ページ遷移 → 全体再レンダリング → 遅い

【App Router（採用）】
ページ遷移 → 変更部分のみレンダリング → 高速
```

**React Server Components (RSC)**
- サーバーサイドでHTMLを生成
- JavaScriptバンドルサイズ削減
- 初期表示が高速

### 4.2 'use client' の最小化

```tsx
// サーバーコンポーネント（デフォルト）
// → JavaScriptを送信しない
export default function Page() {
  return <div>静的コンテンツ</div>
}

// クライアントコンポーネント（必要な箇所のみ）
'use client'
export default function InteractivePart() {
  const [state, setState] = useState()
  return <button onClick={() => setState(...)}>クリック</button>
}
```

### 4.3 Tailwind CSS のJIT（Just-In-Time）コンパイル

```
【従来のCSS】
全CSSを読み込み → 数百KB → 遅い

【Tailwind JIT】
使用クラスのみ生成 → 数十KB → 高速
```

### 4.4 画像最適化

```tsx
// Next.js Image コンポーネント
<Image
  src="/dog.jpg"
  width={200}
  height={200}
  loading="lazy"  // 遅延読み込み
/>
```

- WebP自動変換
- 遅延読み込み（Lazy Loading）
- 適切なサイズでの配信

### 4.5 API Routes のエッジ対応

```typescript
// サーバーレス関数
// → コールドスタートあり

// エッジ関数（採用可能）
export const runtime = 'edge'
// → 世界中のエッジで実行、低レイテンシ
```

### 4.6 Prisma クエリ最適化

```typescript
// 関連データを一度に取得（N+1問題回避）
const dogs = await prisma.dog.findMany({
  include: {
    vaccineSchedules: true,
    walkHistory: true,
  }
})
```

### 4.7 レンダリング戦略の使い分け

| 戦略 | 使用箇所 | 理由 |
|------|----------|------|
| SSG（静的生成） | ランディングページ | 変更なし、最速 |
| SSR（サーバー） | ダッシュボード | ユーザー固有データ |
| CSR（クライアント） | リアルタイム機能 | インタラクティブ |

---

## 5. 機能一覧

### 5.1 無料機能（15機能）

| # | 機能名 | 説明 | ページ |
|---|--------|------|--------|
| 1 | 犬プロフィール | 名前・犬種・年齢管理 | /dashboard |
| 2 | ワクチン管理 | 自動スケジュール生成 | /vaccine |
| 3 | 散歩トラッキング | GPS記録・ルート表示 | /walk |
| 4 | かかりつけ獣医 | 病院登録・検索 | /vet |
| 5 | ご近所コミュニティ | 匿名投稿・相談 | /community |
| 6 | イベント情報 | 展示会・パピーパーティ | /events |
| 7 | 周辺施設検索 | 病院・ドッグラン | /places |
| 8 | ペット飲食店 | 同伴OKのお店 | /restaurants |
| 9 | 家族共有 | お世話情報シェア | /family |
| 10 | 犬種分布 | 全国ランキング | /breed-stats |
| 11 | 保険レコメンド | AIマッチング | /insurance |
| 12 | SNS投稿生成 | キャプション作成 | /sns |
| 13 | おすすめグッズ | Amazon商品紹介 | /goods |
| 14 | AIレシピ | 手作りごはん | /recipe |
| 15 | 犬種診断 | 相性マッチング | /breed-match |

### 5.2 プレミアム機能（3機能）

| # | 機能名 | 説明 | ページ |
|---|--------|------|--------|
| 1 | AI鳴き声翻訳 | 感情分析・翻訳 | /voice |
| 2 | AIフード見直し | パーソナライズ提案 | /food |
| 3 | 高度な保険分析 | 詳細比較・スコア | /insurance |

---

## 6. データベース設計

### 6.1 ER図（主要テーブル）

```
User
├── id (PK)
├── email (UNIQUE)
├── password (bcrypt)
├── stripeCustomerId
├── subscriptionStatus
└── trialEndsAt

Dog
├── id (PK)
├── userId (FK → User)
├── name
├── breed
├── birthDate
├── dogSize
└── mainConcern

VaccineSchedule
├── id (PK)
├── dogId (FK → Dog)
├── type (mixed_vaccine, rabies, etc.)
├── scheduledDate
└── completed

WalkHistory
├── id (PK)
├── userId (FK → User)
├── dogId (FK → Dog)
├── duration
├── distance
└── routePolyline

CommunityPost
├── id (PK)
├── userId (FK → User)
├── content
├── category
├── latitude / longitude
└── isAnonymous
```

---

## 7. UI/UXデザイン

### 7.1 カラーパレット（パステル系）

```css
/* メインカラー */
--pink-400: #F472B6;      /* アクセント */
--cream-50: #FFFBF5;      /* 背景 */
--brown-700: #5D4E37;     /* テキスト */

/* 機能別カラー */
--voice: #C084FC;         /* 鳴き声翻訳 */
--health: #5DD9B0;        /* 健康管理 */
--walk: #7DD3FC;          /* 散歩 */
--food: #FFA584;          /* フード */
--insurance: #67E8F9;     /* 保険 */
--family: #F9A8D4;        /* 家族 */
```

### 7.2 デザイン原則

1. **安心感を最優先** - 柔らかいパステルカラー
2. **専門用語NG** - 「分からない」選択肢を必ず用意
3. **押し売り禁止** - CTAは控えめに
4. **医療・法的注意書き** - 常時表示

---

## 8. 開発工程

### Phase 1: プロジェクト初期化（1日目）
- [x] Next.js 14 プロジェクト作成
- [x] Tailwind CSS 設定
- [x] Prisma + SQLite 設定
- [x] 基本レイアウト・グローバルCSS

### Phase 2: 認証・決済（2日目）
- [x] NextAuth.js 設定
- [x] 会員登録ページ
- [x] Stripe Checkout 統合
- [x] Webhook 処理
- [x] 解約機能

### Phase 3: オンボーディング（3日目）
- [x] 初回オンボーディング画面
- [x] AIヒアリング（会話形式）
- [x] ヒアリング結果保存

### Phase 4: コア機能（4-5日目）
- [x] ダッシュボード
- [x] ワクチンスケジュール
- [x] 保険AIレコメンド
- [x] 散歩トラッキング

### Phase 5: AI機能（6-7日目）
- [x] 鳴き声翻訳（Premium）
- [x] SNS投稿生成
- [x] AIレシピ生成
- [x] フード見直し（Premium）

### Phase 6: コミュニティ（8日目）
- [x] ご近所匿名投稿
- [x] いいね・通報機能
- [x] 位置ベースフィルタリング

### Phase 7: 周辺情報（9日目）
- [x] かかりつけ獣医
- [x] 周辺施設検索
- [x] ペット飲食店
- [x] イベント情報

### Phase 8: 追加機能（10日目〜）
- [x] 家族共有
- [x] 犬種分布統計
- [x] おすすめグッズ（Amazon連携）
- [x] 犬種診断

---

## 9. セキュリティ

### 9.1 認証
- **パスワード**: bcryptjs でハッシュ化
- **セッション**: JWT（30日有効）
- **CSRF**: NextAuth.js で自動対策

### 9.2 API保護
```typescript
// 全APIでセッション確認
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
}
```

### 9.3 プレミアム機能ゲート
```typescript
// サブスクリプション確認
if (session.user.subscriptionStatus !== 'active' &&
    session.user.subscriptionStatus !== 'trialing') {
  return NextResponse.json({ error: 'プレミアム機能です' }, { status: 403 });
}
```

---

## 10. PWA対応

### 10.1 機能
- オフライン対応（Service Worker）
- ホーム画面追加
- プッシュ通知（ワクチンリマインダー）

### 10.2 設定ファイル
```json
// manifest.json
{
  "name": "わんライフ",
  "short_name": "わんライフ",
  "display": "standalone",
  "theme_color": "#F472B6"
}
```

---

## 11. パフォーマンス指標

| 指標 | 目標値 | 実現方法 |
|------|--------|----------|
| FCP | < 1.5s | SSR + Edge |
| LCP | < 2.5s | 画像最適化 |
| CLS | < 0.1 | レイアウト固定 |
| TTI | < 3.0s | コード分割 |

---

## 12. 今後の拡張計画

### 短期（1-3ヶ月）
- [ ] PostgreSQL移行（本番環境）
- [ ] Google Places API 本番連携
- [ ] Amazon PA-API 連携

### 中期（3-6ヶ月）
- [ ] React Native アプリ化
- [ ] 獣医師向けダッシュボード
- [ ] ペット保険会社API連携

### 長期（6ヶ月〜）
- [ ] IoT連携（スマート首輪）
- [ ] 獣医オンライン相談
- [ ] ペットシッターマッチング

---

## 付録A: 環境変数

```bash
# Database
DATABASE_URL="file:./dev.db"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

# Cron
CRON_SECRET="your-cron-secret"
```

---

## 付録B: ディレクトリ構造

```
wansapo-app/
├── prisma/
│   └── schema.prisma
├── public/
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── app/
│   │   ├── api/              # 35+ APIエンドポイント
│   │   ├── [23 pages]/       # 機能ページ
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/               # 共通UI
│   │   └── [features]/       # 機能コンポーネント
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── openai.ts
│   │   ├── stripe.ts
│   │   └── prisma.ts
│   └── types/
├── docs/
│   └── REQUIREMENTS.md       # 本ドキュメント
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---

**作成日**: 2024年
**最終更新**: 2024年
**バージョン**: 1.0.0
