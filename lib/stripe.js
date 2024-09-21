import Stripe from 'stripe'

import { getServerHref } from './handleRestAction'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export const createStripeSession = async (mode = 'payment', req, lineItems = []) => {
  const successUrl = req.body?.successUrl ?? `${req.origin}/success`
  // Redirect to the afterStripe handler with the session ID from Stripe
  const afterStripeSuccessUrl = `${getServerHref(req)}/api/${req.query.app}/people/${req.query.token}/payments/afterStripe?mode=${mode}&sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(successUrl)}`
  const cancelUrl = req.body?.cancelUrl ?? `${req.origin}/cancel`

  const session = await stripe.checkout.sessions.create({
    mode: mode,
    payment_method_types: ['card', 'link'],
    line_items: lineItems,
    success_url: afterStripeSuccessUrl,
    cancel_url: cancelUrl
  })

  return session
}
