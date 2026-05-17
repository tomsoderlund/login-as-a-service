import jwt from 'jsonwebtoken'
import { sql } from 'sql-wizard'

import { handleRestAction, setAccessControlHeaders } from '../../../../../lib/handleRestAction'
import { runDatabaseFunction } from '../../../../../lib/database'
import { createStripeSession } from '../../../../../lib/stripe'
const { getAppBySlug } = require('../../../../../lib/data/apps')

async function handleAfterStripe (req, res, pool, user_id, app) { // eslint-disable-line camelcase
  if (req.method !== 'GET') throw new Error(`${req.method} method not allowed:405`)
  const [personApp] = await sql.sqlFind(pool, 'person_app', { user_id })
  const newCreditsAmount = (personApp?.credits ?? 0) + parseInt(req.query.credits)
  await sql.sqlUpdate(pool, 'person_app', { user_id }, {
    ...(req.query.mode === 'payment' && { purchase_session_id: req.query.sessionId }),
    ...(req.query.mode === 'subscription' && { subscription_session_id: req.query.sessionId }),
    ...(req.query.subMode === 'credits' && { credits: newCreditsAmount })
  })
  res.redirect(302, decodeURIComponent(req.query.redirect))
}

async function handlePurchaseCredits (req, res, pool, user_id, app) { // eslint-disable-line camelcase
  if (!['OPTIONS', 'POST'].includes(req.method)) throw new Error(`${req.method} method not allowed:405`)
  setAccessControlHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const session = await createStripeSession('payment', 'credits', req, [
    {
      price_data: {
        product_data: { name: req.body?.productName ?? `${app.name ?? app.slug} Credits` },
        unit_amount: req.body?.amount ?? app.credits_price ?? 100,
        currency: req.body?.currency ?? app.currency ?? 'usd'
      },
      quantity: req.body?.quantity ?? 10
    }
  ])
  res.status(200).json({ url: session.url })
}

async function handlePurchase (req, res, pool, user_id, app) { // eslint-disable-line camelcase
  if (!['OPTIONS', 'POST'].includes(req.method)) throw new Error(`${req.method} method not allowed:405`)
  setAccessControlHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const session = await createStripeSession('payment', undefined, req, [
    {
      price_data: {
        product_data: { name: req.body?.productName ?? 'Product' },
        unit_amount: req.body?.amount ?? 500,
        currency: req.body?.currency ?? 'usd'
      },
      quantity: req.body?.quantity ?? 1
    }
  ])
  res.status(200).json({ url: session.url })
}

async function handleSubscription (req, res, pool, user_id, app) { // eslint-disable-line camelcase
  if (!['OPTIONS', 'POST'].includes(req.method)) throw new Error(`${req.method} method not allowed:405`)
  setAccessControlHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const session = await createStripeSession('subscription', undefined, req, [
    {
      price: req.body?.priceId,
      quantity: req.body?.quantity ?? 1
    }
  ])
  res.status(200).json({ url: session.url })
}

async function handleUseCredits (req, res, pool, user_id, app) { // eslint-disable-line camelcase
  if (!['OPTIONS', 'POST'].includes(req.method)) throw new Error(`${req.method} method not allowed:405`)
  setAccessControlHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const [personApp] = await sql.sqlFind(pool, 'person_app', { user_id })
  const creditsUsed = parseInt(req.body.quantity ?? 1)
  if (creditsUsed < 0) throw new Error('Can't use a negative amount of credits:400')
  const newCreditsAmount = (personApp?.credits ?? 0) - creditsUsed
  if (newCreditsAmount < 0) throw new Error('Not enough credits:400')
  await sql.sqlUpdate(pool, 'person_app', { user_id }, { credits: newCreditsAmount })
  res.status(200).json({ credits_used: creditsUsed, credits: newCreditsAmount })
}

const actions = {
  afterStripe: handleAfterStripe,
  'purchase-credits': handlePurchaseCredits,
  purchase: handlePurchase,
  subscription: handleSubscription,
  'use-credits': handleUseCredits
}

export default async function handler (req, res) {
  await handleRestAction(async () => {
    const actionHandler = actions[req.query.action]
    if (!actionHandler) throw new Error(`Unknown action '${req.query.action}':404`)

    await runDatabaseFunction(async (pool) => {
      const app = await getAppBySlug(pool, req.query.app)
      if (!app) throw new Error(`App '${req.query.app}' not found:404`)
      const { user_id } = await jwt.verify(req.query.token, app.secret) // eslint-disable-line camelcase
      if (!user_id) throw new Error('Invalid login token:401') // eslint-disable-line camelcase
      await actionHandler(req, res, pool, user_id, app)
    })
  }, res)
}
