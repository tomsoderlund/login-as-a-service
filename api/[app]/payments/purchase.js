import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

/**
 * Handles the creation of a Stripe payment.
 * @param {http.IncomingMessage} req - The request object.
 * @param {http.ServerResponse} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the handler is complete.
 * @throws {Error} - Throws an error if the Stripe session creation fails.
 */
export default async function handler (req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    res.status(200).end()
    return
  }
  if (req.method === 'POST') {
    try {
      const origin = req.headers.origin
      const successUrl = req.body?.successUrl ?? `${origin}/success`
      const cancelUrl = req.body?.cancelUrl ?? `${origin}/cancel`

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card', 'link'],
        line_items: [
          {
            price_data: {
              product_data: {
                name: req.body?.productName ?? 'Product'
              },
              unit_amount: req.body?.amount ?? 500, // Amount in cents ($5.00)
              currency: req.body?.currency ?? 'usd'
            },
            quantity: req.body?.quantity ?? 1
          }
        ],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl
      })

      res.setHeader('Access-Control-Allow-Origin', '*')
      res.status(200).json({ url: session.url })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Internal server error'
      res.status(500).json({ statusCode: 500, message: errorMessage })
    }
  } else {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method Not Allowed')
  }
}