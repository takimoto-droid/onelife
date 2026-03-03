import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIResponse } from '@/lib/openai';
import prisma from '@/lib/prisma';

const HEARING_SYSTEM_PROMPT = `あなたは「わんサポ」という犬を飼い始めた人向けのAIアシスタントです。
やさしく、安心感を与える話し方をしてください。

ヒアリングの流れ：
1. 犬種を聞く（わからない場合も OK）
2. 誕生日または推定年齢を聞く
3. お迎えした日を聞く
4. 動物病院に行ったことがあるか聞く
5. 一番の不安や心配ごとを聞く

ルール：
- 1回の返答で1つの質問だけをする
- 「わからない」という回答も肯定的に受け止める
- 専門用語は使わない
- 絵文字は控えめに
- 最後の質問が終わったら「ありがとうございます！これでヒアリングは完了です。」と伝える

現在のステップ: {step}`;

interface HearingRequest {
  message: string;
  history: { role: 'assistant' | 'user'; content: string }[];
  step: number;
  dogId: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { message, history, step, dogId }: HearingRequest = await request.json();

    // AIレスポンス取得
    const systemPrompt = HEARING_SYSTEM_PROMPT.replace('{step}', String(step));
    const aiResponse = await getAIResponse(systemPrompt, message, history);

    // ヒアリング完了判定
    const isComplete = step >= 5 || aiResponse.includes('ヒアリングは完了です');

    // 情報をDBに保存（ステップに応じて）
    if (dogId) {
      const updateData: Record<string, unknown> = {};

      // ステップに応じてデータを保存
      if (step === 1 && message && !message.includes('わからない')) {
        updateData.breed = message;
      } else if (step === 2) {
        // 年齢/誕生日のパース（簡易）
        const ageMatch = message.match(/(\d+)/);
        if (ageMatch) {
          const birthDate = new Date();
          if (message.includes('ヶ月') || message.includes('か月')) {
            birthDate.setMonth(birthDate.getMonth() - parseInt(ageMatch[1]));
          } else {
            birthDate.setFullYear(birthDate.getFullYear() - parseInt(ageMatch[1]));
          }
          updateData.birthDate = birthDate;
        }
      } else if (step === 3) {
        // お迎え日のパース（簡易）
        const monthMatch = message.match(/(\d+)/);
        if (monthMatch) {
          const adoptedAt = new Date();
          if (message.includes('ヶ月') || message.includes('か月')) {
            adoptedAt.setMonth(adoptedAt.getMonth() - parseInt(monthMatch[1]));
          } else if (message.includes('週間')) {
            adoptedAt.setDate(adoptedAt.getDate() - parseInt(monthMatch[1]) * 7);
          }
          updateData.adoptedAt = adoptedAt;
        }
      } else if (step === 4) {
        updateData.hasVisitedVet = message.includes('はい') || message.includes('ある') || message.includes('行った');
      } else if (step === 5) {
        updateData.mainConcern = message;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.dog.update({
          where: { id: dogId },
          data: updateData,
        });
      }

      // ヒアリング完了時にオンボーディングを完了にする
      if (isComplete) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { onboarded: true },
        });
      }
    }

    return NextResponse.json({
      response: aiResponse,
      isComplete,
      nextStep: isComplete ? null : step + 1,
    });
  } catch (error) {
    console.error('Hearing API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
