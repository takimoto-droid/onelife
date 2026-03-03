import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function createCheckoutSession(
  customerId: string,
  userEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | null> {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    // モックモード: 決済をスキップしてダッシュボードへ
    return { url: successUrl + '?mock=true' };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 7,
      },
    });

    return { url: session.url || successUrl };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return null;
  }
}

export async function createCustomer(email: string): Promise<string | null> {
  if (!stripe) {
    // モックモード: ランダムなIDを返す
    return `mock_cus_${Date.now()}`;
  }

  try {
    const customer = await stripe.customers.create({ email });
    return customer.id;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    // モックモード: 成功を返す
    return true;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('Stripe subscription cancellation error:', error);
    return false;
  }
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event | null> {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return null;
  }
}

export default stripe;
