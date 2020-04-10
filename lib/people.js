const { Pool } = require('pg')
const jwt = require('jsonwebtoken')
const { sql: { sqlFind, sqlFindOrCreate, sqlUpdate } } = require('sql-wizard')

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

          setAccessControlHeaders(res)
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

const getPersonInfo = async ({ pool, user_id }) => { // eslint-disable-line camelcase
  const sqlString = `SELECT user_id, username, email, first_name, last_name, country, metadata, person_id FROM person_app
LEFT JOIN person ON (person_app.person_id = person.id)
WHERE user_id = '${user_id}';` // eslint-disable-line camelcase
  const { rows } = await pool.query(sqlString)
  const { metadata, ...person } = rows[0]
  return { metadata, person }
}

const getPerson = async ({ pool, res, query, app, user_id }) => { // eslint-disable-line camelcase
  // Person
  const { metadata, person } = await getPersonInfo({ pool, user_id })
  delete person.person_id
  // Return results
  setAccessControlHeaders(res, 'GET')
  res.json({ ...person, ...metadata })
}

const updatePerson = async ({ pool, res, query, body, app, user_id }) => { // eslint-disable-line camelcase
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
  const { method, query, body } = req
  const appSlug = query.app
  const pool = new Pool({ connectionString: config.databaseUrl })
  pool.connect(async (databaseError, client, release) => {
    await handleRestAction(async () => {
      // General for all methods
      if (databaseError) throw new Error(databaseError)
      if (!['GET', 'PATCH'].includes(method)) throw new Error(`${method} method not allowed:405`)
      // App
      const app = await getAppBySlug(pool, appSlug)
      if (!app) throw new Error(`App '${appSlug}' not found:404`)
      // User ID
      const { user_id } = await jwt.verify(query.token, app.secret) // eslint-disable-line camelcase
      // For each method
      if (method === 'GET') {
        await getPerson({ pool, res, query, app, user_id })
      } else if (method === 'PATCH') {
        await updatePerson({ pool, res, query, body, app, user_id })
      }
    }, release, res)
  })
}
