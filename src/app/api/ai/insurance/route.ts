import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getAIResponse } from '@/lib/openai';

// 実際の日本のペット保険サービス
const REAL_INSURANCES = [
  {
    name: 'どうぶつ健保ふぁみりぃ',
    company: 'アニコム損害保険',
    baseMonthlyPrice: 2500,
    coveragePercent: 70,
    features: [
      '業界最大手で提携病院が多い',
      '窓口精算対応（提携病院で保険証提示のみ）',
      '24時間獣医師相談サービス付き',
      'LINE対応で手続き簡単',
    ],
    pros: '提携病院での窓口精算が便利。サポート体制が充実。',
    cons: '保険料はやや高め。',
    url: 'https://www.anicom-sompo.co.jp/',
  },
  {
    name: 'うちの子',
    company: 'アイペット損害保険',
    baseMonthlyPrice: 2200,
    coveragePercent: 70,
    features: [
      '窓口精算対応の提携病院が多い',
      '通院・入院・手術をフルカバー',
      '保険料の値上がりが緩やか',
      'ペット賠償責任特約あり',
    ],
    pros: '補償範囲が広く、長期加入でも保険料が安定。',
    cons: '一部地域で提携病院が少ない場合も。',
    url: 'https://www.ipet-ins.com/',
  },
  {
    name: 'PS保険',
    company: 'ペットメディカルサポート',
    baseMonthlyPrice: 1500,
    coveragePercent: 50,
    features: [
      '保険料が業界最安クラス',
      '補償限度日数・回数なし',
      '免責金額なし',
      '歯科治療も補償対象',
    ],
    pros: 'コストパフォーマンスが非常に高い。歯科治療も対象。',
    cons: '窓口精算非対応（後日請求）。',
    url: 'https://pshoken.co.jp/',
  },
  {
    name: 'FPCフリーペットほけん',
    company: 'FPC',
    baseMonthlyPrice: 1200,
    coveragePercent: 50,
    features: [
      '業界最安水準の保険料',
      'シンプルでわかりやすいプラン',
      '年齢による保険料の値上がりが小さい',
      'Webで簡単申し込み',
    ],
    pros: '保険料が安く、シンプルで分かりやすい。',
    cons: '補償割合50%のみ。窓口精算非対応。',
    url: 'https://www.fpc-pet.co.jp/',
  },
  {
    name: 'ペット＆ファミリー げんきナンバーわんスリム',
    company: 'ペット＆ファミリー損害保険',
    baseMonthlyPrice: 1800,
    coveragePercent: 70,
    features: [
      '10歳以上も保険料が上がりにくい',
      '通院補償に特化したプランあり',
      '全国の動物病院で利用可能',
      'T&Dグループの安心感',
    ],
    pros: 'シニア犬でも保険料が安定。大手グループの安心感。',
    cons: '窓口精算非対応。',
    url: 'https://www.petfamilyins.co.jp/',
  },
  {
    name: 'ペット保険「プリズムコール」',
    company: '日本ペット少額短期保険',
    baseMonthlyPrice: 2000,
    coveragePercent: 100,
    features: [
      '補償割合100%プランあり',
      '入院・手術に特化',
      '保険料が比較的リーズナブル',
      '大型犬でも加入しやすい',
    ],
    pros: '100%補償で自己負担ゼロも可能。',
    cons: '通院は補償対象外のプランが多い。',
    url: 'https://www.nihonpet.co.jp/',
  },
];

// 犬種別のリスク情報
const BREED_RISKS: Record<string, { risk: string; diseases: string[] }> = {
  'トイプードル': {
    risk: '膝蓋骨脱臼、外耳炎、涙やけ',
    diseases: ['膝蓋骨脱臼', '外耳炎', '進行性網膜萎縮症'],
  },
  'チワワ': {
    risk: '膝蓋骨脱臼、水頭症、気管虚脱',
    diseases: ['膝蓋骨脱臼', '水頭症', '低血糖症'],
  },
  '柴犬': {
    risk: 'アレルギー性皮膚炎、緑内障',
    diseases: ['アトピー性皮膚炎', '緑内障', '認知症'],
  },
  'ミニチュアダックスフンド': {
    risk: '椎間板ヘルニア、外耳炎',
    diseases: ['椎間板ヘルニア', '外耳炎', '進行性網膜萎縮症'],
  },
  'フレンチブルドッグ': {
    risk: '呼吸器疾患、皮膚炎、熱中症',
    diseases: ['短頭種気道症候群', '皮膚炎', '股関節形成不全'],
  },
  'ゴールデンレトリバー': {
    risk: '股関節形成不全、がん',
    diseases: ['股関節形成不全', 'リンパ腫', '皮膚炎'],
  },
  'ラブラドールレトリバー': {
    risk: '股関節形成不全、肥満',
    diseases: ['股関節形成不全', '外耳炎', '肥満関連疾患'],
  },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 犬の情報を取得
    const dogs = await prisma.dog.findMany({
      where: { userId: session.user.id },
    });

    const dog = dogs[0];

    if (!dog) {
      return NextResponse.json({
        recommendations: REAL_INSURANCES.slice(0, 3).map((ins) => ({
          ...ins,
          monthlyPrice: ins.baseMonthlyPrice,
          reason: '一般的におすすめのプランです。',
        })),
        aiAnalysis: null,
      });
    }

    // 年齢を計算
    let ageInMonths = 12;
    let ageText = '1歳程度';
    if (dog.birthDate) {
      const now = new Date();
      const birth = new Date(dog.birthDate);
      ageInMonths = Math.floor(
        (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      if (ageInMonths < 12) {
        ageText = `${ageInMonths}ヶ月`;
      } else {
        const years = Math.floor(ageInMonths / 12);
        ageText = `${years}歳`;
      }
    }

    // 犬種のリスク情報を取得
    const breedRisk = dog.breed ? BREED_RISKS[dog.breed] || null : null;

    // AIによる分析（APIキーがある場合）
    let aiAnalysis = null;
    const systemPrompt = `あなたはペット保険の専門家です。以下の犬の情報を分析して、保険選びのアドバイスを2-3文で簡潔に提供してください。

犬の情報:
- 名前: ${dog.name}
- 犬種: ${dog.breed || '不明'}
- 年齢: ${ageText}
- 動物病院訪問歴: ${dog.hasVisitedVet ? 'あり' : 'なし'}
- 飼い主の主な心配: ${dog.mainConcern || '特になし'}
${breedRisk ? `- この犬種の注意すべき疾患: ${breedRisk.diseases.join(', ')}` : ''}

アドバイスは具体的で、この犬に特化した内容にしてください。`;

    try {
      aiAnalysis = await getAIResponse(
        systemPrompt,
        '保険選びのアドバイスをお願いします。'
      );
    } catch {
      // AIが使えない場合はモック
      if (breedRisk) {
        aiAnalysis = `${dog.name}ちゃん（${dog.breed}）は、${breedRisk.risk}などに注意が必要な犬種です。通院補償が充実したプランがおすすめです。`;
      } else {
        aiAnalysis = `${dog.name}ちゃんは${ageText}なので、${ageInMonths < 12 ? '子犬のうちに加入すると保険料が抑えられます' : 'まだお若いうちに保険加入を検討されることをおすすめします'}。`;
      }
    }

    // 犬の情報に基づいてレコメンドをカスタマイズ
    const recommendations = generateRecommendations(dog, ageInMonths, breedRisk);

    return NextResponse.json({
      recommendations,
      aiAnalysis,
      dogInfo: {
        name: dog.name,
        breed: dog.breed,
        age: ageText,
      },
    });
  } catch (error) {
    console.error('Insurance API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

interface BreedRisk {
  risk: string;
  diseases: string[];
}

function generateRecommendations(
  dog: { name: string; breed: string | null; mainConcern: string | null },
  ageInMonths: number,
  breedRisk: BreedRisk | null
) {
  const recommendations = [];

  // 年齢による保険料調整（概算）
  const ageFactor = ageInMonths < 12 ? 0.8 : ageInMonths < 36 ? 1.0 : ageInMonths < 84 ? 1.3 : 1.6;

  // 子犬（1歳未満）の場合
  if (ageInMonths < 12) {
    const ins = REAL_INSURANCES[0]; // アニコム
    recommendations.push({
      ...ins,
      monthlyPrice: Math.round(ins.baseMonthlyPrice * ageFactor),
      reason: `${dog.name}ちゃんはまだ子犬なので、窓口精算対応で急な通院にも便利なアニコムがおすすめ。提携病院が多く、初めてのペット保険に最適です。`,
      recommended: true,
    });

    const ins2 = REAL_INSURANCES[2]; // PS保険
    recommendations.push({
      ...ins2,
      monthlyPrice: Math.round(ins2.baseMonthlyPrice * ageFactor),
      reason: `保険料を抑えたい場合はPS保険。子犬のうちは月${Math.round(ins2.baseMonthlyPrice * ageFactor).toLocaleString()}円程度で加入でき、歯科治療も補償対象です。`,
    });
  }
  // シニア犬（7歳以上）の場合
  else if (ageInMonths >= 84) {
    const ins = REAL_INSURANCES[4]; // ペット＆ファミリー
    recommendations.push({
      ...ins,
      monthlyPrice: Math.round(ins.baseMonthlyPrice * ageFactor),
      reason: `${dog.name}ちゃんはシニア期に入っているので、10歳以降も保険料が上がりにくいペット＆ファミリーがおすすめ。長期的な医療費に備えられます。`,
      recommended: true,
    });

    const ins2 = REAL_INSURANCES[5]; // プリズムコール
    recommendations.push({
      ...ins2,
      monthlyPrice: Math.round(ins2.baseMonthlyPrice * ageFactor),
      reason: `シニア期は大きな手術が必要になることも。100%補償のプリズムコールなら、高額な手術費用もしっかりカバーできます。`,
    });
  }
  // 成犬の場合
  else {
    // 犬種リスクがある場合
    if (breedRisk) {
      const ins = REAL_INSURANCES[1]; // アイペット
      recommendations.push({
        ...ins,
        monthlyPrice: Math.round(ins.baseMonthlyPrice * ageFactor),
        reason: `${dog.breed}は${breedRisk.risk}に注意が必要。通院・入院・手術をフルカバーするアイペットなら安心です。`,
        recommended: true,
      });
    } else {
      const ins = REAL_INSURANCES[0];
      recommendations.push({
        ...ins,
        monthlyPrice: Math.round(ins.baseMonthlyPrice * ageFactor),
        reason: `${dog.name}ちゃんに万全の備えを。窓口精算対応で通院時の負担が少ないアニコムがおすすめです。`,
        recommended: true,
      });
    }

    // コスパ重視
    const ins2 = REAL_INSURANCES[3]; // FPC
    recommendations.push({
      ...ins2,
      monthlyPrice: Math.round(ins2.baseMonthlyPrice * ageFactor),
      reason: `保険料を抑えたいなら業界最安クラスのFPC。シンプルで分かりやすく、月々の負担が軽いのが魅力です。`,
    });
  }

  // 心配ごとに応じた追加レコメンド
  if (dog.mainConcern?.includes('費用') || dog.mainConcern?.includes('保険')) {
    const ins = REAL_INSURANCES[2]; // PS保険
    if (!recommendations.find((r) => r.name === ins.name)) {
      recommendations.push({
        ...ins,
        monthlyPrice: Math.round(ins.baseMonthlyPrice * ageFactor),
        reason: `費用が気になるとのこと。PS保険は業界最安クラスながら補償内容が充実しており、歯科治療も対象です。`,
      });
    }
  }

  // 最大3件に制限
  return recommendations.slice(0, 3);
}
