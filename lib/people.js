const { Pool } = require('pg')
const jwt = require('jsonwebtoken')
const { sql: { sqlFind, sqlFindOrCreate } } = require('sql-wizard')

const { config } = require('../config/config')
const { handleRestAction, setAccessControlHeaders } = require('./handleRestAction')
const { getAppBySlug } = require('./apps')
const { sendLoginMessage } = require('./messaging')
const postWebhook = require('./webhooks')

const suggestUsername = async (pool, username, email) => {
  const slugBase = username || email.match(/([a-z]*)/gi)[0]

  // Find existing slugs
  const sqlString = `SELECT username FROM person_app WHERE app_id = 1 AND username ILIKE '${slugBase}%';`
  const { rows } = await pool.query(sqlString)
  const existingSlugsArray = rows.map(row => row.username)

  // Find a slug that either 1) is not found in existingSlugsArray, or 2) already has a specified position in existingSlugsArray
  let attemptNr = 0
  let slugSuggestion
  do {
    attemptNr += 1
    slugSuggestion = slugBase + ((attemptNr > 1) ? '-' + attemptNr : '')
  }
  while (existingSlugsArray.indexOf(slugSuggestion) !== -1) // && existingSlugsArray.indexOf(slugSuggestion) !== newWordsPositionInArray)
  return slugSuggestion
}

const anonymizeEmail = email => email.split('@').map((part, isDomain) => isDomain ? part : part[0] + new Array(part.length).join('•')).join('@')

module.exports.createPerson = async (requestType, req, res) => {
  const { method, body, query } = req
  const appSlug = query.app
  const pool = new Pool({ connectionString: config.databaseUrl })
  pool.connect(async (err, client, release) => {
    if (err) throw new Error(err)
    await handleRestAction(async () => {
      if (method === 'OPTIONS') {
        setAccessControlHeaders(res)
        res.end()
      } else if (method === 'POST') {
        // App
        const app = await getAppBySlug(pool, appSlug)
        if (!app) throw new Error(`App '${appSlug}' not found:404`)

        // Person
        const { email, username, firstName, lastName, country, ...metadata } = (typeof body === 'string') ? JSON.parse(body) : body
        if (!email) throw new Error('Person has no \'email\' property:400')
        let person, personApp

        if (requestType === 'login') {
          const people = await sqlFind(pool, 'person', { email })
          if (!people.length) throw new Error('Person not found:404')
          person = people[0]

          // Person-App
          const personAppIds = { person_id: person.id, app_id: app.id }
          const personApps = await sqlFind(pool, 'person_app', personAppIds)
          if (!personApps.length) throw new Error('User not found:404')
          personApp = personApps[0]

          if (!personApp.can_login) throw new Error('User doesn’t have right to log in:401')

          // Send email
          const { messageId } = await sendLoginMessage(app, person, personApp)

          res.json({ message: 'Check email for the login link', messageId })
        } else {
          // Lead or Signup
          person = await sqlFindOrCreate(pool, 'person', { email }, { email, first_name: firstName, last_name: lastName, country }, { findRowByField: 'email' })

          const validUsername = await suggestUsername(pool, username, email)

          // Person-App
          const personAppIds = { person_id: person.id, app_id: app.id }
          const personAppData = {
            ...personAppIds,
            username: validUsername,
            can_login: requestType !== 'lead',
            metadata
          }
          const personAppRaw = await sqlFindOrCreate(pool, 'person_app', personAppIds, personAppData, { findRowByField: 'person_id,app_id' })
          // If newly-created, parse differently
          personApp = personAppRaw.command === 'INSERT'
            ? personAppRaw.rows[0]
            : personAppRaw
          // if (personAppRaw.command !== 'INSERT') throw new Error(`This person already exists in '${appSlug}' not found:409`)

          // Send email if not lead
          if (requestType !== 'lead') await sendLoginMessage(app, person, personApp)

          // Webhook
          await postWebhook({
            text: `New ${requestType} for ${app.name}: ${anonymizeEmail(person.email)} (#${person.id})`
          })

          // Return results
          setAccessControlHeaders(res)
          res.json({ message: (personAppRaw.command === 'INSERT' ? 'New person created' : 'Person created') })
        }
      } else {
        throw new Error(`${method} method not allowed:405`)
      }
    }, release, res)
  })
}

module.exports.getPerson = async (req, res) => {
  const { method, query } = req
  const appSlug = query.app
  const pool = new Pool({ connectionString: config.databaseUrl })
  pool.connect(async (err, client, release) => {
    if (err) throw new Error(err)
    await handleRestAction(async () => {
      if (method === 'GET') {
        // App
        const app = await getAppBySlug(pool, appSlug)
        if (!app) throw new Error(`App '${appSlug}' not found:404`)

        const { user_id } = await jwt.verify(query.token, app.secret) // eslint-disable-line camelcase

        // Person
        const sqlString = `SELECT user_id, username, email, first_name, last_name, country, metadata FROM person_app
LEFT JOIN person ON (person_app.person_id = person.id)
WHERE user_id = '${user_id}';` // eslint-disable-line camelcase
        const { rows } = await pool.query(sqlString)
        const { metadata, ...person } = rows[0]

        // Return results
        setAccessControlHeaders(res, 'GET')
        res.json({ ...person, ...metadata })
      } else {
        throw new Error(`${method} method not allowed:405`)
      }
    }, release, res)
  })
}
