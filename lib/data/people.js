const jwt = require('jsonwebtoken')
const { sql: { sqlFind, sqlFindOrCreate, sqlUpdate } } = require('sql-wizard')

const { handleRestAction, setAccessControlHeaders } = require('../handleRestAction')
const { runDatabaseFunction } = require('../database')
const { sendLoginMessage } = require('../messaging')
const postWebhook = require('../webhooks')
const { getAppBySlug } = require('./apps')
const { generateToken } = require('../tokens')

const toSlug = str => str.trim().replace(/[^\w-]+/g, '').toLowerCase()
const usernameFromEmail = email => toSlug(email.split('@')[0])

const suggestUsername = async (pool, username, email) => {
  const slugBase = username || usernameFromEmail(email)

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
  await runDatabaseFunction(async (pool) => {
    await handleRestAction(async () => {
      if (method === 'OPTIONS') {
        setAccessControlHeaders(res)
        res.end()
      } else if (method === 'POST') {
        // App
        const app = await getAppBySlug(pool, appSlug)
        if (!app) throw new Error(`App '${appSlug}' not found:404`)

        // Person
        const { email: emailRaw, username: usernameRaw, firstName, lastName, country, ...metadata } = (typeof body === 'string') ? JSON.parse(body) : body
        if (!emailRaw) throw new Error('Person has no \'email\' property:400')
        const email = emailRaw.trim().toLowerCase()
        const username = usernameRaw ? usernameRaw.trim().toLowerCase() : undefined

        let person; let personApp; let signupDirectUserWasFound = false

        // signup-direct precheck: if personApp exists, treat as a 'login'
        if (requestType === 'signup-direct') {
          // Person
          const people = await sqlFind(pool, 'person', { email })
          if (people.length) {
            person = people[0]

            // Person-App
            const personAppIds = { person_id: person.id, app_id: app.id }
            const personApps = await sqlFind(pool, 'person_app', personAppIds)
            if (personApps.length) signupDirectUserWasFound = true
          }
        }

        if (requestType === 'login' || signupDirectUserWasFound) {
          // Person
          const people = await sqlFind(pool, 'person', { email })
          if (!people.length) throw new Error('Person not found:404')
          person = people[0]

          // Person-App
          const personAppIds = { person_id: person.id, app_id: app.id }
          const personApps = await sqlFind(pool, 'person_app', personAppIds)
          if (!personApps.length) throw new Error('App user not found:404')
          personApp = personApps[0]

          if (!personApp.can_login) throw new Error('User doesn’t have the right to log in:401')

          // Send email
          const { messageId } = await sendLoginMessage(app, person, personApp)

          setAccessControlHeaders(res)
          res.json({ message: 'Check email for the login link', messageId })
        } else {
          // Lead or Signup

          // Person
          person = await sqlFindOrCreate(pool, 'person', { email }, { email, first_name: firstName, last_name: lastName, country })

          const validUsername = await suggestUsername(pool, username, email)

          // Person-App
          const personAppIds = { person_id: person.id, app_id: app.id }
          const personAppData = {
            ...personAppIds,
            username: validUsername,
            can_login: requestType !== 'lead',
            metadata
          }
          const personApp = await sqlFindOrCreate(pool, 'person_app', personAppIds, personAppData)

          // Send email if not lead or signup-direct
          if (!['lead', 'signup-direct'].includes(requestType)) await sendLoginMessage(app, person, personApp)

          // Webhook
          await postWebhook({
            text: `New ${requestType} for ${app.name}: ${anonymizeEmail(person.email)} (#${person.id})`
          })

          // Return results
          setAccessControlHeaders(res)
          const results = {
            message: (personApp.command === 'INSERT' ? 'New person created' : 'Person created')
          }

          // Add token if signup-direct
          if (requestType === 'signup-direct') {
            results.person = {
              token: generateToken(personApp, app),
              ...formatPersonData({ ...personApp, email: person.email })
            }
          }

          res.json(results)
        }
      } else {
        throw new Error(`${method} method not allowed:405`)
      }
    }, res)
  })
}

const getPersonInfo = async ({ pool, user_id }) => { // eslint-disable-line camelcase
  const sqlString = `SELECT
    user_id, person_id, can_login,
    username, email,
    first_name, last_name, country,
    subscribe_email, subscribe_sms,
    metadata,
    purchase_session_id, subscription_session_id, purchase_credits FROM person_app
    LEFT JOIN person ON (person_app.person_id = person.id)
    WHERE user_id = '${user_id}';` // eslint-disable-line camelcase
  const { rows } = await pool.query(sqlString)
  if (!rows[0]) throw new Error('Person not found:404')
  const { metadata, ...person } = rows[0]
  return { metadata, person }
}

const formatPersonData = (personApp) => {
  const { metadata, person_id, app_id, ...person } = personApp // eslint-disable-line camelcase
  const user_id_numeric = personApp.person_id // eslint-disable-line camelcase
  return { user_id_numeric, ...person, ...metadata }
}

const getPerson = async ({ pool, res, user_id }) => { // eslint-disable-line camelcase
  // Person
  const { metadata, person } = await getPersonInfo({ pool, user_id })
  // Return results
  setAccessControlHeaders(res, 'GET')
  res.json(formatPersonData({ metadata, ...person }))
}

const updatePerson = async ({ pool, res, body, user_id }) => { // eslint-disable-line camelcase
  const { username, email, first_name, last_name, country, ...newMetadata } = body // eslint-disable-line camelcase
  const newPersonData = {}
  // Person
  const existingPerson = await getPersonInfo({ pool, user_id })
  // Username unique
  if (username) {
    newPersonData.username = await suggestUsername(pool, username)
  }
  // Other fields
  if (email) newPersonData.email = email
  if (first_name) newPersonData.first_name = first_name // eslint-disable-line camelcase
  if (last_name) newPersonData.last_name = last_name // eslint-disable-line camelcase
  if (country) newPersonData.country = country
  // Metadata
  const metadata = { ...existingPerson.metadata, ...newMetadata }
  // Update tables
  await sqlUpdate(pool, 'person', { id: existingPerson.person.person_id }, newPersonData)
  await sqlUpdate(pool, 'person_app', { user_id }, { metadata })
  // Return results
  setAccessControlHeaders(res, 'PATCH')
  res.json({ ...newPersonData, metadata })
}

module.exports.getOrUpdatePerson = async (req, res) => {
  const { method, query } = req
  const appSlug = query.app
  await runDatabaseFunction(async (pool) => {
    await handleRestAction(async () => {
      // General for all methods
      if (!['GET', 'PATCH'].includes(method)) throw new Error(`${method} method not allowed:405`)
      // App
      const app = await getAppBySlug(pool, appSlug)
      if (!app) throw new Error(`App '${appSlug}' not found:404`)
      // User ID
      const { user_id } = await jwt.verify(query.token, app.secret) // eslint-disable-line camelcase
      if (!user_id) throw new Error('Invalid login token:401') // eslint-disable-line camelcase
      // For each method
      if (method === 'GET') {
        await getPerson({ pool, res, user_id })
      } else if (method === 'PATCH') {
        await updatePerson({ pool, res, user_id })
      }
    }, res)
  })
}
