import jwt from 'jsonwebtoken'
import { sql } from 'sql-wizard'

import { handleRestAction } from '../../../../../lib/handleRestAction'
import { runDatabaseFunction } from '../../../../../lib/database'
const { getAppBySlug } = require('../../../../../lib/data/apps')

/** Updates database after a successful Stripe payment */
export default async function handler (req, res) {
  await handleRestAction(async () => {
    // General for all methods
    if (!['GET'].includes(req.method)) throw new Error(`${req.method} method not allowed:405`)

    await runDatabaseFunction(async (pool) => {
      // App
      const app = await getAppBySlug(pool, req.query.app)
      if (!app) throw new Error(`App '${req.query.app}' not found:404`)
      // User ID
      const { user_id } = await jwt.verify(req.query.token, app.secret) // eslint-disable-line camelcase
      if (!user_id) throw new Error('Invalid login token:401') // eslint-disable-line camelcase

      // For each method
      if (req.method === 'GET') {
        // req.query = { mode: 'payment', sessionId: 'cs_test_a1b2c3d4e5f6g7h8i9j0k1l2', redirect: 'https://example.com/success' }
        const decodedRedirect = decodeURIComponent(req.query.redirect)
        await sql.sqlUpdate(pool, 'person_app', { user_id }, {
          ...(req.query.mode === 'payment' && { purchase_session_id: req.query.sessionId }),
          ...(req.query.mode === 'subscription' && { subscription_session_id: req.query.sessionId })
          // purchase_credits
        })
        res.redirect(302, decodedRedirect)
      }
    })
  }, undefined, res)
}
