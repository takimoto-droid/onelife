import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Amazon検索URL生成ヘルパー（アフィリエイトタグは実際の運用時に設定）
const generateAmazonUrl = (productName: string): string => {
  const searchQuery = encodeURIComponent(productName + ' ドッグフード');
  // 実際の運用ではアフィリエイトタグを追加: &tag=your-affiliate-tag-22
  return `https://www.amazon.co.jp/s?k=${searchQuery}&i=pet-supplies`;
};

// ドッグフードのデータベース（モック）
const DOG_FOODS = [
  {
    id: 'food-1',
    name: 'ロイヤルカナン ミニ インドア アダルト',
    brand: 'ロイヤルカナン',
    category: 'プレミアム',
    targetAge: ['adult'],
    targetSize: ['small'],
    features: ['室内犬向け', '消化ケア', '体重管理'],
    goodFor: ['運動量が少ない', '太りやすい', '消化が気になる'],
    caution: ['活動的な犬には物足りない場合も', '価格がやや高め'],
    suitableFor: '室内で過ごすことが多い小型犬の飼い主さん',
    price: '約3,500円/2kg',
    rating: 4.3,
    amazonUrl: generateAmazonUrl('ロイヤルカナン ミニ インドア アダルト'),
  },
  {
    id: 'food-2',
    name: 'ヒルズ サイエンス・ダイエット アダルト',
    brand: 'ヒルズ',
    category: 'プレミアム',
    targetAge: ['adult'],
    targetSize: ['small', 'medium', 'large'],
    features: ['栄養バランス', '獣医師推奨', '消化サポート'],
    goodFor: ['お腹が弱い', '栄養バランス重視', '獣医師に相談したい'],
    caution: ['好みが分かれる場合がある', '粒がやや大きめ'],
    suitableFor: '安心して選びたい、獣医師のおすすめを信頼する方',
    price: '約3,800円/2.5kg',
    rating: 4.4,
    amazonUrl: generateAmazonUrl('ヒルズ サイエンスダイエット 犬'),
  },
  {
    id: 'food-3',
    name: 'ニュートロ シュプレモ 小型犬用',
    brand: 'ニュートロ',
    category: 'プレミアム',
    targetAge: ['puppy', 'adult'],
    targetSize: ['small'],
    features: ['自然素材', '食いつき良好', '皮膚・被毛ケア'],
    goodFor: ['食いつきが悪い', '毛並みを良くしたい', '自然派志向'],
    caution: ['やや高価', '在庫切れになりやすい'],
    suitableFor: '食いつきの良さと自然素材にこだわりたい方',
    price: '約4,200円/3kg',
    rating: 4.5,
    amazonUrl: generateAmazonUrl('ニュートロ シュプレモ 小型犬'),
  },
  {
    id: 'food-4',
    name: 'オリジン オリジナル',
    brand: 'オリジン',
    category: '超プレミアム',
    targetAge: ['puppy', 'adult', 'senior'],
    targetSize: ['small', 'medium', 'large'],
    features: ['高タンパク', 'グレインフリー', '肉85%'],
    goodFor: ['活動的', 'アレルギーが心配', 'タンパク質重視'],
    caution: ['高価格帯', '消化器が弱い子には注意', '急な切り替えNG'],
    suitableFor: '品質最優先、活発なワンちゃんの飼い主さん',
    price: '約6,500円/2kg',
    rating: 4.7,
    amazonUrl: generateAmazonUrl('オリジン オリジナル 犬'),
  },
  {
    id: 'food-5',
    name: 'アカナ パピー&ジュニア',
    brand: 'アカナ',
    category: '超プレミアム',
    targetAge: ['puppy'],
    targetSize: ['small', 'medium'],
    features: ['成長期向け', '地元食材', 'グレインフリー'],
    goodFor: ['子犬の成長サポート', 'アレルギー予防', '栄養たっぷり'],
    caution: ['成犬には切り替え必要', '価格が高い'],
    suitableFor: '子犬の健康的な成長を最優先にしたい方',
    price: '約5,800円/2kg',
    rating: 4.6,
    amazonUrl: generateAmazonUrl('アカナ パピー ジュニア'),
  },
  {
    id: 'food-6',
    name: 'ピュリナ ワン ほぐし粒入り',
    brand: 'ピュリナ',
    category: 'スタンダード',
    targetAge: ['adult'],
    targetSize: ['small', 'medium'],
    features: ['コスパ良好', '2種類の食感', '入手しやすい'],
    goodFor: ['コスト重視', '飽きやすい', 'どこでも買える'],
    caution: ['プレミアムフードと比較すると原材料に差', '好き嫌いがある'],
    suitableFor: 'コストパフォーマンスを重視したい方',
    price: '約1,500円/2.1kg',
    rating: 3.9,
    amazonUrl: generateAmazonUrl('ピュリナワン ほぐし粒'),
  },
  {
    id: 'food-7',
    name: 'アイムス 成犬用 健康維持用',
    brand: 'アイムス',
    category: 'スタンダード',
    targetAge: ['adult'],
    targetSize: ['small', 'medium', 'large'],
    features: ['バランス栄養', 'お手頃価格', '長年の実績'],
    goodFor: ['初めてのフード選び', 'スタンダードで十分', '安定供給'],
    caution: ['こだわり派には物足りない', '原材料にこだわりがある人は確認を'],
    amazonUrl: generateAmazonUrl('アイムス 成犬用 健康維持'),
    suitableFor: '定番のフードを手軽に続けたい方',
    price: '約1,800円/2.6kg',
    rating: 3.8,
  },
  {
    id: 'food-8',
    name: 'モグワン',
    brand: 'モグワン',
    category: 'プレミアム',
    targetAge: ['puppy', 'adult', 'senior'],
    targetSize: ['small', 'medium'],
    features: ['ヒューマングレード', '無添加', '国内製造'],
    goodFor: ['添加物が気になる', '国産志向', '安心安全重視'],
    caution: ['通販のみ', '価格がやや高め'],
    suitableFor: '原材料の安全性を最優先にしたい方',
    price: '約4,300円/1.8kg',
    rating: 4.2,
    amazonUrl: generateAmazonUrl('モグワン ドッグフード'),
  },
  {
    id: 'food-9',
    name: 'ロイヤルカナン 消化器サポート',
    brand: 'ロイヤルカナン',
    category: '療法食',
    targetAge: ['adult'],
    targetSize: ['small', 'medium', 'large'],
    features: ['消化器ケア', '獣医師処方', '下痢・軟便対策'],
    goodFor: ['下痢が多い', 'お腹が弱い', '獣医師の指示'],
    caution: ['療法食なので獣医師に相談を', '長期使用の場合は定期検診を'],
    suitableFor: 'お腹の調子が気になり、獣医師に相談できる方',
    price: '約4,500円/3kg',
    rating: 4.5,
    amazonUrl: generateAmazonUrl('ロイヤルカナン 消化器サポート'),
  },
  {
    id: 'food-10',
    name: 'ナチュラルバランス L.I.D.',
    brand: 'ナチュラルバランス',
    category: 'プレミアム',
    targetAge: ['adult'],
    targetSize: ['small', 'medium', 'large'],
    features: ['限定原材料', 'アレルギー対応', 'シンプル処方'],
    goodFor: ['アレルギーがある', '原材料をシンプルに', '除去食'],
    caution: ['タンパク源が限定的', '好みが分かれる'],
    suitableFor: '食物アレルギーが心配、または確定している方',
    price: '約4,000円/2.27kg',
    rating: 4.3,
    amazonUrl: generateAmazonUrl('ナチュラルバランス LID 犬'),
  },
];

// ヒアリング回答に基づくスコアリング
function scoreFood(
  food: typeof DOG_FOODS[0],
  answers: {
    ownershipDuration: string;
    dogAge: string;
    digestiveIssue: boolean;
    diarrhea: boolean;
    appetite: string;
    healthChange: string;
  }
): number {
  let score = 0;

  // 犬の年齢に合っているか
  const ageMap: Record<string, string> = {
    'puppy': 'puppy',
    'young': 'adult',
    'adult': 'adult',
    'senior': 'senior',
  };
  if (food.targetAge.includes(ageMap[answers.dogAge] || 'adult')) {
    score += 20;
  }

  // 消化器系の問題がある場合
  if (answers.digestiveIssue || answers.diarrhea) {
    if (food.goodFor.some(g => g.includes('お腹') || g.includes('消化'))) {
      score += 25;
    }
    if (food.features.some(f => f.includes('消化'))) {
      score += 15;
    }
  }

  // 食いつきが悪い場合
  if (answers.appetite === 'poor' || answers.appetite === 'picky') {
    if (food.goodFor.some(g => g.includes('食いつき'))) {
      score += 20;
    }
  }

  // 体調変化がある場合
  if (answers.healthChange === 'skin' || answers.healthChange === 'coat') {
    if (food.features.some(f => f.includes('皮膚') || f.includes('被毛'))) {
      score += 15;
    }
  }

  if (answers.healthChange === 'weight') {
    if (food.features.some(f => f.includes('体重'))) {
      score += 15;
    }
  }

  // 飼育歴が浅い人にはスタンダード〜プレミアムを推奨
  if (answers.ownershipDuration === 'new' || answers.ownershipDuration === 'under1year') {
    if (food.category === 'スタンダード' || food.category === 'プレミアム') {
      score += 10;
    }
  }

  // 飼育歴が長い人にはプレミアム以上を推奨
  if (answers.ownershipDuration === 'over3years') {
    if (food.category === 'プレミアム' || food.category === '超プレミアム') {
      score += 10;
    }
  }

  // 基本評価を加算
  score += food.rating * 5;

  return score;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const answers = await request.json();

    // 各フードをスコアリング
    const scoredFoods = DOG_FOODS.map(food => ({
      ...food,
      score: scoreFood(food, answers),
    }));

    // スコア順にソートして上位3つを選択
    const topFoods = scoredFoods
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // 推奨理由を生成
    const recommendations = topFoods.map((food, index) => {
      let reason = '';

      // 消化器系の問題がある場合
      if ((answers.digestiveIssue || answers.diarrhea) &&
          food.goodFor.some(g => g.includes('お腹') || g.includes('消化'))) {
        reason = 'お腹の調子が気になるワンちゃんに配慮した設計です。';
      }
      // 食いつきが悪い場合
      else if (answers.appetite === 'poor' &&
               food.goodFor.some(g => g.includes('食いつき'))) {
        reason = '食いつきの良さに定評があり、食べムラが気になる子におすすめです。';
      }
      // 皮膚・被毛の問題
      else if ((answers.healthChange === 'skin' || answers.healthChange === 'coat') &&
               food.features.some(f => f.includes('皮膚') || f.includes('被毛'))) {
        reason = '皮膚や被毛の健康をサポートする成分が含まれています。';
      }
      // デフォルト
      else {
        reason = `${food.features.slice(0, 2).join('、')}が特徴のフードです。`;
      }

      return {
        rank: index + 1,
        food: {
          id: food.id,
          name: food.name,
          brand: food.brand,
          category: food.category,
          price: food.price,
          rating: food.rating,
          features: food.features,
          amazonUrl: food.amazonUrl,
        },
        reason,
        goodFor: food.goodFor,
        caution: food.caution,
        suitableFor: food.suitableFor,
      };
    });

    // アドバイスを生成
    let advice = '';
    if (answers.diarrhea) {
      advice = '下痢が続く場合は、まず獣医師に相談されることをおすすめします。フードの切り替えは1〜2週間かけてゆっくり行いましょう。';
    } else if (answers.digestiveIssue) {
      advice = 'お腹の調子が気になる場合、フードの切り替えは少量ずつ、7〜10日かけて行うのがポイントです。';
    } else if (answers.appetite === 'poor') {
      advice = '食いつきを良くするには、ぬるま湯でふやかしたり、トッピングを加えるのも効果的です。';
    } else {
      advice = 'フードの切り替えは急がず、1〜2週間かけて新しいフードの割合を増やしていくのがおすすめです。';
    }

    return NextResponse.json({
      recommendations,
      advice,
      disclaimer: '※ この情報は一般的な参考情報です。ワンちゃんの健康状態によっては獣医師に相談されることをおすすめします。',
    });
  } catch (error) {
    console.error('Food recommendation error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
