import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function getAIResponse(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: { role: 'assistant' | 'user'; content: string }[] = []
): Promise<string> {
  // APIキーがない場合はモックレスポンス
  if (!openai) {
    return getMockResponse(userMessage);
  }

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'assistant' | 'user',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'すみません、うまく返答できませんでした。';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return getMockResponse(userMessage);
  }
}

function getMockResponse(userMessage: string): string {
  // ヒアリング用のモックレスポンス
  if (userMessage.includes('名前')) {
    return '素敵なお名前ですね！では次に、ワンちゃんの犬種を教えてください。わからない場合は「わからない」と答えていただいて大丈夫ですよ。';
  }
  if (userMessage.includes('わからない') || userMessage.includes('不明')) {
    return '大丈夫ですよ！犬種がわからなくても、これからしっかりサポートしていきますね。次に、ワンちゃんのお誕生日（または推定年齢）を教えてください。';
  }
  if (userMessage.includes('歳') || userMessage.includes('ヶ月') || /\d+/.test(userMessage)) {
    return 'ありがとうございます！では、ワンちゃんをお迎えした日を覚えていますか？大体の時期でも大丈夫です。';
  }
  return 'ありがとうございます！引き続きサポートさせていただきますね。何か不安なことがあればいつでも聞いてください。';
}

export default openai;
