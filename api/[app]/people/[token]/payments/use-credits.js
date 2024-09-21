import jwt from 'jsonwebtoken'
import { sql } from 'sql-wizard'

import { handleRestAction, setAccessControlHeaders } from '../../../../../lib/handleRestAction'
import { runDatabaseFunction } from '../../../../../lib/database'
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
        const [personApp] = await sql.sqlFind(pool, 'person_app', { user_id })
        const creditsUsed = parseInt(req.body.quantity)
        if (creditsUsed < 0) throw new Error('Can’t use a negative amount of credits:400')
        const newCreditsAmount = (personApp?.credits ?? 0) - creditsUsed
        if (newCreditsAmount < 0) throw new Error('Not enough credits:400')
        await sql.sqlUpdate(pool, 'person_app', { user_id }, { credits: newCreditsAmount })
        res.status(200).json({
          credits_used: creditsUsed,
          credits: newCreditsAmount
        })
      }
    })
  }, res)
}
