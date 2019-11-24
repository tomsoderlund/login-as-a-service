const { Pool } = require('pg')
const { sql: { sqlFind, sqlFindOrCreate } } = require('sql-wizard')

const { config } = require('../config/config')
const { handleRestAction, setAccessControlHeaders } = require('./handleRestAction')
const { getAppBySlug } = require('./apps')
const { sendLoginEmail } = require('./email')

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
        const { email, firstName, lastName, country, ...metadata } = (typeof body === 'string') ? JSON.parse(body) : body
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

          res.json({ message: 'Check email for the login link' })
        } else {
          // Lead or Signup
          person = await sqlFindOrCreate(pool, 'person', { email }, { email, first_name: firstName, last_name: lastName, country }, { findRowByField: 'email' })

          // Person-App
          const personAppIds = { person_id: person.id, app_id: app.id }
          const personAppData = {
            ...personAppIds,
            metadata
          }
          const personAppRaw = await sqlFindOrCreate(pool, 'person_app', personAppIds, personAppData, { findRowByField: 'person_id,app_id,secret' })
          // If newly-created, parse differently
          personApp = personAppRaw.command === 'INSERT'
            ? personAppRaw.rows[0]
            : personAppRaw
          // if (personAppRaw.command !== 'INSERT') throw new Error(`This person already exists in '${appSlug}' not found:409`)

          // Return results
          setAccessControlHeaders(res)
          res.json({ message: (personAppRaw.command === 'INSERT' ? 'New person created' : 'Person created') })
        }

        // Send email if not lead
        if (requestType !== 'lead') {
          sendLoginEmail(app, person, personApp)
        }
      } else {
        throw new Error(`${method} method not allowed:405`)
      }
    }, release, res)
  })
}
