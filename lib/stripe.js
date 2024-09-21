import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export const createStripeSession = async (mode = 'payment', origin, body, lineItems = []) => {
  const successUrl = body?.successUrl ?? `${origin}/success`
  const cancelUrl = body?.cancelUrl ?? `${origin}/cancel`

  const session = await stripe.checkout.sessions.create({
    mode: mode,
    payment_method_types: ['card', 'link'],
    line_items: lineItems,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl
  })

  return session
}
