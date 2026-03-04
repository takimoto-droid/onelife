import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getAIResponse } from '@/lib/openai';

// 実際の日本のペット保険サービス
interface InsuranceData {
  id: string;
  name: string;
  company: string;
  monthlyPrice: { small: number; medium: number; large: number };
  coveragePercent: number;
  features: {
    hospitalCoverage: boolean;
    surgeryCoverage: boolean;
    multiDiscount: boolean;
    seniorAcceptable: boolean;
    diseaseAcceptable: boolean;
    windowPayment: boolean;
  };
  featureList: string[];
  targetUser: string;
  pros: string;
  cons: string;
  url: string;
}

const INSURANCES: InsuranceData[] = [
  {
    id: 'anicom',
    name: 'どうぶつ健保ふぁみりぃ',
    company: 'アニコム損害保険',
    monthlyPrice: { small: 2500, medium: 3200, large: 4000 },
    coveragePercent: 70,
    features: {
      hospitalCoverage: true,
      surgeryCoverage: true,
      multiDiscount: true,
      seniorAcceptable: true,
      diseaseAcceptable: false,
      windowPayment: true,
    },
    featureList: [
      '業界最大手で提携病院が多い',
      '窓口精算対応（提携病院で保険証提示のみ）',
      '24時間獣医師相談サービス付き',
      'LINE対応で手続き簡単',
    ],
    targetUser: '安心を重視する方、初めてペット保険に入る方',
    pros: '提携病院での窓口精算が便利。サポート体制が充実。',
    cons: '保険料はやや高め。',
    url: 'https://www.anicom-sompo.co.jp/',
  },
  {
    id: 'ipet',
    name: 'うちの子',
    company: 'アイペット損害保険',
    monthlyPrice: { small: 2200, medium: 2800, large: 3500 },
    coveragePercent: 70,
    features: {
      hospitalCoverage: true,
      surgeryCoverage: true,
      multiDiscount: true,
      seniorAcceptable: true,
      diseaseAcceptable: false,
      windowPayment: true,
    },
    featureList: [
      '窓口精算対応の提携病院が多い',
      '通院・入院・手術をフルカバー',
      '保険料の値上がりが緩やか',
      'ペット賠償責任特約あり',
    ],
    targetUser: '長期的なコストを重視する方',
    pros: '補償範囲が広く、長期加入でも保険料が安定。',
    cons: '一部地域で提携病院が少ない場合も。',
    url: 'https://www.ipet-ins.com/',
  },
  {
    id: 'ps',
    name: 'PS保険',
    company: 'ペットメディカルサポート',
    monthlyPrice: { small: 1500, medium: 2000, large: 2500 },
    coveragePercent: 50,
    features: {
      hospitalCoverage: true,
      surgeryCoverage: true,
      multiDiscount: false,
      seniorAcceptable: true,
      diseaseAcceptable: true,
      windowPayment: false,
    },
    featureList: [
      '保険料が業界最安クラス',
      '補償限度日数・回数なし',
      '免責金額なし',
      '歯科治療も補償対象',
    ],
    targetUser: 'コスパを重視する方、持病がある犬の飼い主',
    pros: 'コストパフォーマンスが非常に高い。歯科治療も対象。',
    cons: '窓口精算非対応（後日請求）。',
    url: 'https://pshoken.co.jp/',
  },
  {
    id: 'fpc',
    name: 'FPCフリーペットほけん',
    company: 'FPC',
    monthlyPrice: { small: 1200, medium: 1600, large: 2000 },
    coveragePercent: 50,
    features: {
      hospitalCoverage: true,
      surgeryCoverage: true,
      multiDiscount: false,
      seniorAcceptable: false,
      diseaseAcceptable: false,
      windowPayment: false,
    },
    featureList: [
      '業界最安水準の保険料',
      'シンプルでわかりやすいプラン',
      '年齢による保険料の値上がりが小さい',
      'Webで簡単申し込み',
    ],
    targetUser: '保険料を抑えたい方、若い犬の飼い主',
    pros: '保険料が安く、シンプルで分かりやすい。',
    cons: '補償割合50%のみ。窓口精算非対応。7歳以上は加入不可。',
    url: 'https://www.fpc-pet.co.jp/',
  },
  {
    id: 'petfamily',
    name: 'げんきナンバーわんスリム',
    company: 'ペット＆ファミリー損害保険',
    monthlyPrice: { small: 1800, medium: 2300, large: 2800 },
    coveragePercent: 70,
    features: {
      hospitalCoverage: true,
      surgeryCoverage: true,
      multiDiscount: false,
      seniorAcceptable: true,
      diseaseAcceptable: false,
      windowPayment: false,
    },
    featureList: [
      '10歳以上も保険料が上がりにくい',
      '通院補償に特化したプランあり',
      '全国の動物病院で利用可能',
      'T&Dグループの安心感',
    ],
    targetUser: 'シニア犬の飼い主、長期加入を考える方',
    pros: 'シニア犬でも保険料が安定。大手グループの安心感。',
    cons: '窓口精算非対応。',
    url: 'https://www.petfamilyins.co.jp/',
  },
  {
    id: 'prism',
    name: 'プリズムコール',
    company: '日本ペット少額短期保険',
    monthlyPrice: { small: 2000, medium: 2600, large: 3200 },
    coveragePercent: 100,
    features: {
      hospitalCoverage: false,
      surgeryCoverage: true,
      multiDiscount: true,
      seniorAcceptable: true,
      diseaseAcceptable: false,
      windowPayment: false,
    },
    featureList: [
      '補償割合100%プランあり',
      '入院・手術に特化',
      '保険料が比較的リーズナブル',
      '大型犬でも加入しやすい',
    ],
    targetUser: '手術費用に備えたい方、大型犬の飼い主',
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
  'ポメラニアン': {
    risk: '膝蓋骨脱臼、気管虚脱',
    diseases: ['膝蓋骨脱臼', '気管虚脱', '脱毛症'],
  },
  'シーズー': {
    risk: '眼疾患、皮膚炎',
    diseases: ['角膜炎', '外耳炎', 'アトピー性皮膚炎'],
  },
  'ミックス': {
    risk: '個体差が大きい',
    diseases: [],
  },
};

interface DogProfile {
  dogSize: string | null;
  ageInMonths: number;
  hasDisease: boolean | null;
  visitFrequency: string | null;
  livingEnv: string | null;
  walkFrequency: string | null;
  isMultiDog: boolean;
  anxietyLevel: number | null;
  breed: string | null;
  hasCurrentInsurance: boolean | null;
  insuranceConcern: string | null;
}

interface ScoreResult {
  score: number;
  reasons: string[];
  disqualified: boolean;
  disqualifyReason?: string;
}

// スコア計算関数
function calculateMatchScore(
  insurance: InsuranceData,
  profile: DogProfile
): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. 年齢による加入可否チェック（7歳以上で加入不可の保険）
  if (profile.ageInMonths >= 84) {
    // 7歳以上
    if (!insurance.features.seniorAcceptable) {
      return {
        score: -1,
        reasons: [],
        disqualified: true,
        disqualifyReason: '7歳以上は加入不可',
      };
    }
    score += 20;
    reasons.push('シニア犬でも加入OK');
  }

  // 2. 持病による加入可否チェック
  if (profile.hasDisease === true) {
    if (!insurance.features.diseaseAcceptable) {
      return {
        score: -1,
        reasons: [],
        disqualified: true,
        disqualifyReason: '持病ありは加入不可の場合あり',
      };
    }
    score += 15;
    reasons.push('持病があっても加入しやすい');
  }

  // 3. 通院頻度に応じた通院補償の重要度
  if (profile.visitFrequency === 'high') {
    if (insurance.features.hospitalCoverage) {
      score += 25;
      reasons.push('通院補償が充実');
    }
  }

  // 4. 生活環境・散歩頻度による手術補償の重要度
  if (profile.livingEnv !== 'indoor' || profile.walkFrequency === 'daily') {
    if (insurance.features.surgeryCoverage) {
      score += 20;
      reasons.push('アクティブな生活に手術補償で備えられる');
    }
  }

  // 5. 多頭飼いの場合の割引
  if (profile.isMultiDog) {
    if (insurance.features.multiDiscount) {
      score += 15;
      reasons.push('多頭割引でお得');
    }
  }

  // 6. 不安度に応じた補償割合
  if (profile.anxietyLevel && profile.anxietyLevel >= 4) {
    if (insurance.coveragePercent >= 70) {
      score += 25;
      reasons.push('補償割合が高く、医療費の不安を軽減');
    }
  } else if (profile.anxietyLevel && profile.anxietyLevel <= 2) {
    // 不安度低い→コスパ重視
    const size = (profile.dogSize || 'small') as 'small' | 'medium' | 'large';
    const price = insurance.monthlyPrice[size] || insurance.monthlyPrice.small;
    if (price <= 2000) {
      score += 15;
      reasons.push('保険料が抑えめでコスパ◎');
    }
  }

  // 7. 窓口精算（利便性ボーナス）
  if (insurance.features.windowPayment) {
    score += 10;
    reasons.push('窓口精算対応で手続き簡単');
  }

  // 8. 見直しユーザー向けの調整
  if (profile.hasCurrentInsurance === true) {
    if (profile.insuranceConcern === 'expensive') {
      // 保険料が高いと思っている→安い保険を優先
      const size = (profile.dogSize || 'small') as 'small' | 'medium' | 'large';
      const price = insurance.monthlyPrice[size] || insurance.monthlyPrice.small;
      if (price <= 1800) {
        score += 20;
        reasons.push('保険料を抑えられる');
      }
    } else if (profile.insuranceConcern === 'low_coverage') {
      // 補償が少ないと思っている→補償が手厚い保険を優先
      if (insurance.coveragePercent >= 70) {
        score += 20;
        reasons.push('補償が手厚い');
      }
    } else if (profile.insuranceConcern === 'complicated') {
      // 手続きが面倒→窓口精算対応を優先
      if (insurance.features.windowPayment) {
        score += 20;
        reasons.push('窓口精算で手続き簡単');
      }
    }
  }

  return { score, reasons, disqualified: false };
}

// 理由文生成
function generateReasonText(
  reasons: string[],
  profile: DogProfile,
  insurance: InsuranceData
): string {
  if (reasons.length === 0) {
    return `${insurance.targetUser}におすすめです。`;
  }

  let intro = '';
  if (profile.anxietyLevel && profile.anxietyLevel >= 4) {
    intro = '医療費が心配とのことなので、';
  } else if (profile.hasCurrentInsurance && profile.insuranceConcern) {
    const concerns: Record<string, string> = {
      expensive: '保険料を見直したいとのことなので、',
      low_coverage: '補償を充実させたいとのことなので、',
      complicated: '手続きを簡単にしたいとのことなので、',
    };
    intro = concerns[profile.insuranceConcern] || '';
  } else if (profile.isMultiDog) {
    intro = '多頭飼いをされているので、';
  } else {
    intro = '';
  }

  const mainReasons = reasons.slice(0, 2).join('、');
  return `${intro}${mainReasons}のでおすすめです。`;
}

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
      // 犬の情報がない場合はデフォルトの推薦
      const defaultRecs = INSURANCES.slice(0, 3).map((ins, index) => ({
        ...ins,
        monthlyPrice: ins.monthlyPrice.small,
        rank: index + 1,
        matchScore: 50,
        reason: '一般的におすすめのプランです。',
        recommended: index === 0,
      }));

      return NextResponse.json({
        recommendations: defaultRecs,
        aiAnalysis: null,
        dogInfo: null,
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

    // 犬のプロファイルを作成
    const profile: DogProfile = {
      dogSize: dog.dogSize,
      ageInMonths,
      hasDisease: dog.hasDisease,
      visitFrequency: dog.visitFrequency,
      livingEnv: dog.livingEnv,
      walkFrequency: dog.walkFrequency,
      isMultiDog: dog.isMultiDog || false,
      anxietyLevel: dog.anxietyLevel,
      breed: dog.breed,
      hasCurrentInsurance: dog.hasCurrentInsurance,
      insuranceConcern: dog.insuranceConcern,
    };

    // 各保険のスコアを計算
    const scoredInsurances = INSURANCES.map((insurance) => {
      const result = calculateMatchScore(insurance, profile);
      return {
        insurance,
        ...result,
      };
    });

    // 加入可能な保険をスコア順にソート
    const validInsurances = scoredInsurances
      .filter((item) => !item.disqualified)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // 犬種のリスク情報を取得
    const breedRisk = dog.breed ? BREED_RISKS[dog.breed] || null : null;

    // AIによる分析
    let aiAnalysis = null;
    const systemPrompt = `あなたはペット保険の専門家です。以下の犬の情報を分析して、保険選びのアドバイスを2-3文で簡潔に提供してください。押し売りは絶対にしないでください。

犬の情報:
- 名前: ${dog.name}
- 犬種: ${dog.breed || '不明'}
- 年齢: ${ageText}
- サイズ: ${dog.dogSize === 'small' ? '小型犬' : dog.dogSize === 'medium' ? '中型犬' : dog.dogSize === 'large' ? '大型犬' : '不明'}
- 持病: ${dog.hasDisease === true ? 'あり' : dog.hasDisease === false ? 'なし' : '不明'}
- 通院頻度: ${dog.visitFrequency || '不明'}
- 医療費の不安度: ${dog.anxietyLevel || '不明'}/5
${breedRisk ? `- この犬種の注意すべき疾患: ${breedRisk.diseases.join(', ')}` : ''}

アドバイスは具体的で、この犬に特化した内容にしてください。`;

    try {
      aiAnalysis = await getAIResponse(
        systemPrompt,
        '保険選びのアドバイスをお願いします。'
      );
    } catch {
      // AIが使えない場合はモック
      if (breedRisk && breedRisk.diseases.length > 0) {
        aiAnalysis = `${dog.name}ちゃん（${dog.breed}）は、${breedRisk.risk}などに注意が必要な犬種です。通院補償が充実したプランを検討されることをおすすめします。`;
      } else if (ageInMonths < 12) {
        aiAnalysis = `${dog.name}ちゃんはまだ子犬なので、今のうちに保険に加入しておくと保険料を抑えられます。成長とともに病気のリスクも変わってくるので、通院・手術両方カバーできるプランがおすすめです。`;
      } else if (ageInMonths >= 84) {
        aiAnalysis = `${dog.name}ちゃんはシニア期に入っているので、保険料が上がりにくいプランがおすすめです。高齢になると医療費も増える傾向があるので、今のうちに備えておくと安心です。`;
      } else {
        aiAnalysis = `${dog.name}ちゃんの生活スタイルに合った保険を選ぶことが大切です。保険料と補償内容のバランスを見て、無理のない範囲で検討してみてください。`;
      }
    }

    // レコメンデーションを生成
    const size = (dog.dogSize || 'small') as 'small' | 'medium' | 'large';
    const recommendations = validInsurances.map((item, index) => ({
      id: item.insurance.id,
      name: item.insurance.name,
      company: item.insurance.company,
      monthlyPrice: item.insurance.monthlyPrice[size] || item.insurance.monthlyPrice.small,
      coveragePercent: item.insurance.coveragePercent,
      features: item.insurance.featureList,
      pros: item.insurance.pros,
      cons: item.insurance.cons,
      url: item.insurance.url,
      rank: index + 1,
      matchScore: item.score,
      reason: generateReasonText(item.reasons, profile, item.insurance),
      recommended: index === 0,
    }));

    return NextResponse.json({
      recommendations,
      aiAnalysis,
      dogInfo: {
        name: dog.name,
        breed: dog.breed,
        age: ageText,
        size: dog.dogSize,
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
