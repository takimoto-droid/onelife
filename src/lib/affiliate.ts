// ================================================
// アフィリエイト・送客設定
// ================================================
//
// 【概要】
// 保険比較サイトへの送客URLとトラッキングパラメータを管理
// 将来的に管理画面から変更可能な設計
//
// 【マネタイズモデル】
// - 資料請求: 成果報酬
// - 見積もり: 成果報酬
// - 保険契約: 成約報酬
// ================================================

// 環境変数から設定を読み込み（将来的にDBから読み込み可能）
export const AFFILIATE_CONFIG = {
  // 保険比較サイト設定
  insurance: {
    // 送客先URL（環境変数で上書き可能）
    baseUrl: process.env.NEXT_PUBLIC_INSURANCE_AFFILIATE_URL || 'https://example-insurance-site.com',
    // 紹介元識別子
    referralCode: process.env.NEXT_PUBLIC_AFFILIATE_REF_CODE || 'wanlife',
    // キャンペーンID（オプション）
    campaignId: process.env.NEXT_PUBLIC_AFFILIATE_CAMPAIGN_ID || '',
    // 有効/無効フラグ
    enabled: process.env.NEXT_PUBLIC_AFFILIATE_ENABLED !== 'false',
  },
  // トラッキング設定
  tracking: {
    // UTMパラメータ
    utmSource: 'wanlife_app',
    utmMedium: 'referral',
    utmCampaign: 'insurance_comparison',
  },
};

// 犬情報の型定義
export interface DogInfoForAffiliate {
  breed: string;       // 犬種
  age: number;         // 年齢（歳）
  weight: number;      // 体重（kg）
  visitFrequency?: string;  // 通院頻度
  hasCondition?: boolean;   // 持病の有無
}

// トラッキングパラメータ付きURLを生成
export function generateAffiliateUrl(dogInfo?: DogInfoForAffiliate): string {
  const config = AFFILIATE_CONFIG.insurance;

  if (!config.enabled) {
    return config.baseUrl;
  }

  const url = new URL(config.baseUrl);

  // 基本トラッキングパラメータ
  url.searchParams.set('ref', config.referralCode);

  // キャンペーンIDがあれば追加
  if (config.campaignId) {
    url.searchParams.set('campaign', config.campaignId);
  }

  // UTMパラメータ
  url.searchParams.set('utm_source', AFFILIATE_CONFIG.tracking.utmSource);
  url.searchParams.set('utm_medium', AFFILIATE_CONFIG.tracking.utmMedium);
  url.searchParams.set('utm_campaign', AFFILIATE_CONFIG.tracking.utmCampaign);

  // 犬情報がある場合は追加
  if (dogInfo) {
    if (dogInfo.breed) {
      url.searchParams.set('breed', dogInfo.breed);
    }
    if (dogInfo.age !== undefined && dogInfo.age > 0) {
      url.searchParams.set('age', dogInfo.age.toString());
    }
    if (dogInfo.weight !== undefined && dogInfo.weight > 0) {
      url.searchParams.set('weight', dogInfo.weight.toString());
    }
    if (dogInfo.visitFrequency) {
      url.searchParams.set('visit', dogInfo.visitFrequency);
    }
    if (dogInfo.hasCondition !== undefined) {
      url.searchParams.set('condition', dogInfo.hasCondition ? '1' : '0');
    }
  }

  // タイムスタンプ（クリック追跡用）
  url.searchParams.set('t', Date.now().toString());

  return url.toString();
}

// アフィリエイトクリックをログ記録（将来的にAnalytics連携）
export function trackAffiliateClick(
  type: 'insurance_comparison',
  dogInfo?: DogInfoForAffiliate
): void {
  // コンソールログ（開発用）
  if (process.env.NODE_ENV === 'development') {
    console.log('[Affiliate Click]', {
      type,
      dogInfo,
      timestamp: new Date().toISOString(),
    });
  }

  // 将来的にここでAnalyticsイベント送信
  // analytics.track('affiliate_click', { type, ...dogInfo });
}

// 送客先の表示名（UI用）
export const AFFILIATE_DISPLAY = {
  insurance: {
    siteName: '保険比較サイト',
    ctaText: 'おすすめ保険を比較する',
    description: '無料で保険を比較できます',
    benefits: [
      '複数の保険会社を一括比較',
      '無料で見積もり・資料請求',
      '専門スタッフがサポート',
    ],
  },
};

// 犬種リスト（保険診断用）
export const DOG_BREEDS = [
  'トイプードル',
  'チワワ',
  '柴犬',
  'ミニチュアダックスフンド',
  'ポメラニアン',
  'フレンチブルドッグ',
  'ミニチュアシュナウザー',
  'シーズー',
  'マルチーズ',
  'ヨークシャーテリア',
  'パピヨン',
  'ゴールデンレトリバー',
  'ラブラドールレトリバー',
  'コーギー',
  'ビーグル',
  'ボーダーコリー',
  'パグ',
  'ジャックラッセルテリア',
  'ミックス',
  'その他',
];

// 通院頻度の選択肢
export const VISIT_FREQUENCY_OPTIONS = [
  { value: 'none', label: 'ほとんどなし', description: '年に0〜1回' },
  { value: 'low', label: 'たまに', description: '年に2〜3回' },
  { value: 'medium', label: '定期的', description: '年に4〜6回' },
  { value: 'high', label: '頻繁', description: '月に1回以上' },
];
