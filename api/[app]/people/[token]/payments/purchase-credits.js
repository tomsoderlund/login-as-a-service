import jwt from 'jsonwebtoken'

import { handleRestAction, setAccessControlHeaders } from '../../../../../lib/handleRestAction'
import { runDatabaseFunction } from '../../../../../lib/database'
import { createStripeSession } from '../../../../../lib/stripe'
const { getAppBySlug } = require('../../../../../lib/data/apps')

/**
 * Handles the creation of a Stripe payment.
 * @param {http.IncomingMessage} req - The request object.
 * @param {http.ServerResponse} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the handler is complete.
 * @throws {Error} - Throws an error if the Stripe session creation fails.
 */
export default async function handler (req, res) {
  await handleRestAction(async () => {
    // General for all methods
    if (!['OPTIONS', 'POST'].includes(req.method)) throw new Error(`${req.method} method not allowed:405`)

    await runDatabaseFunction(async (pool) => {
      // App
      const app = await getAppBySlug(pool, req.query.app)
      if (!app) throw new Error(`App '${req.query.app}' not found:404`)
      // User ID
      const { user_id } = await jwt.verify(req.query.token, app.secret) // eslint-disable-line camelcase
      if (!user_id) throw new Error('Invalid login token:401') // eslint-disable-line camelcase

      // For each method
      setAccessControlHeaders(res)
      if (req.method === 'OPTIONS') {
        res.status(200).end()
      } else if (req.method === 'POST') {
        const session = await createStripeSession('payment', 'credits', req, [
          {
            price_data: {
              product_data: {
                name: req.body?.productName ?? `${app.name ?? app.slug} Credits`
              },
              unit_amount: req.body?.amount ?? app.credits_price ?? 100, // Amount in cents ($1.00)
              currency: req.body?.currency ?? app.currency ?? 'usd'
            },
            quantity: req.body?.quantity ?? 10
          }
        ])
        res.status(200).json({ url: session.url })
      }
    })
  }, res)
}
