const { Pool } = require('pg')
const { sql: { sqlFindOrCreate } } = require('sql-wizard')

const { config } = require('../../config/config')
const { handleRestAction, setAccessControlHeaders } = require('../../lib/handleRestAction')
const { getAppByName } = require('../../lib/apps')

module.exports = async (req, res) => {
  const { method, body, query } = req
  const appName = query.app
  const pool = new Pool({ connectionString: config.databaseUrl })
  pool.connect(async (err, client, release) => {
    if (err) throw new Error(err)
    await handleRestAction(async () => {
      if (method === 'OPTIONS') {
        setAccessControlHeaders(res)
        res.end()
      } else if (method === 'POST') {
        const { email, ...metadata } = (typeof body === 'string') ? JSON.parse(body) : body
        console.log('body:', { email, metadata, body })
        if (!email) throw new Error('Lead has no \'email\' property:400')
        const person = await sqlFindOrCreate(pool, 'person', { email }, { email, metadata }, { findRowByField: 'email' })
        const app = await getAppByName(pool, appName)
        if (!app) throw new Error(`App '${appName}' not found:404`)
        const personAppIds = { person_id: person.id, app_id: app.id }
        const personAppRaw = await sqlFindOrCreate(pool, 'person_app', personAppIds, personAppIds, { findRowByField: 'person_id,app_id,token' })
        // If newly-created, parse differently
        // const personApp = personAppRaw.command === 'INSERT'
        //   ? personAppRaw.rows[0]
        //   : personAppRaw
        // if (personAppRaw.command !== 'INSERT') throw new Error(`This person already exists in '${appName}' not found:409`)
        setAccessControlHeaders(res)
        res.json({ message: (personAppRaw.command === 'INSERT' ? 'New lead created' : 'Lead created') })
      } else {
        throw new Error(`${method} method not allowed:405`)
      }
    }, release, res)
  })
}
