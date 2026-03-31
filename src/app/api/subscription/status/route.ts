import { NextResponse } from 'next/server';

// Demo mode - always return premium status
export async function GET() {
  return NextResponse.json({
    isPremium: true,
    provider: null,
    subscriptionStatus: 'active',
    isTrialing: false,
    trialEndsAt: null,
    billingStartDate: null,
    nextBillingDate: null,
    isCanceling: false,
    canceledAt: null,
    features: {
      food: true,
      aiRecipe: true,
      snsPost: true,
      voiceTranslation: true,
      community: true,
    },
  });
}
