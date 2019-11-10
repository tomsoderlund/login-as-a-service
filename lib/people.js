const { Pool } = require('pg')
const { sql: { sqlFindOrCreate } } = require('sql-wizard')

const { config } = require('../config/config')
const { handleRestAction, setAccessControlHeaders } = require('./handleRestAction')
const { getAppBySlug } = require('./apps')

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
        const { email, firstName, lastName, country, ...metadata } = (typeof body === 'string') ? JSON.parse(body) : body
        if (!email) throw new Error('Lead has no \'email\' property:400')

        // Person
        const person = await sqlFindOrCreate(pool, 'person', { email }, { email, first_name: firstName, last_name: lastName, country }, { findRowByField: 'email' })

        // App
        const app = await getAppBySlug(pool, appSlug)
        if (!app) throw new Error(`App '${appSlug}' not found:404`)

        // Person-App
        const personAppIds = { person_id: person.id, app_id: app.id }
        const personAppData = {
          ...personAppIds,
          metadata
        }
        const personAppRaw = await sqlFindOrCreate(pool, 'person_app', personAppIds, personAppData, { findRowByField: 'person_id,app_id,token' })
        // If newly-created, parse differently
        // const personApp = personAppRaw.command === 'INSERT'
        //   ? personAppRaw.rows[0]
        //   : personAppRaw
        // if (personAppRaw.command !== 'INSERT') throw new Error(`This person already exists in '${appSlug}' not found:409`)

        // Return results
        setAccessControlHeaders(res)
        res.json({ message: (personAppRaw.command === 'INSERT' ? 'New lead created' : 'Lead created') })
      } else {
        throw new Error(`${method} method not allowed:405`)
      }
    }, release, res)
  })
}
