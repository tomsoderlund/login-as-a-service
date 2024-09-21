import Stripe from 'stripe'

import { getServerHref } from './handleRestAction'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

/**
 * Creates a Stripe checkout session.
 * @param {string} [mode='payment'] - 'payment' or 'subscription'.
 * @param {string | undefined} subMode - Supported: 'credits'.
 * @param {http.IncomingMessage} req - The request object.
 * @param {Array} [lineItems=[]] - The Stripe line items for the session.
 * @returns {Promise<Object>} - The created Stripe session.
 */
export const createStripeSession = async (mode = 'payment', subMode, req, lineItems = []) => {
  const successUrl = req.body?.successUrl ?? `${req.headers.origin}/success`
  // Redirect to the afterStripe handler with the session ID from Stripe
  const credits = lineItems?.[0]?.quantity ?? 0
  const afterStripeSuccessUrl = `${getServerHref(req)}/api/${req.query.app}/people/${req.query.token}/payments/afterStripe?mode=${mode}&subMode=${subMode}&credits=${credits}&sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(successUrl)}`
  const cancelUrl = req.body?.cancelUrl ?? `${req.headers.origin}/cancel`

  const session = await stripe.checkout.sessions.create({
    mode: mode,
    payment_method_types: ['card', 'link'],
    line_items: lineItems,
    success_url: afterStripeSuccessUrl,
    cancel_url: cancelUrl
  })

  return session
}
