const { Pool } = require('pg')
const { sql: { sqlFindOrCreate } } = require('sql-wizard')

const { config } = require('../../config/config')
const handleRestAction = require('../../lib/handleRestAction')
const { getAppByName } = require('../../lib/apps')

module.exports = async (req, res) => {
  const { method, body, query } = req
  const appName = query.app
  const pool = new Pool({ connectionString: config.databaseUrl })
  pool.connect(async (err, client, release) => {
    if (err) throw new Error(err)
    await handleRestAction(async () => {
      if (method === 'POST') {
        const { email, ...metadata } = body
        const person = await sqlFindOrCreate(pool, 'person', { email }, { email, metadata }, { findRowByField: 'email', debug: true })
        const app = await getAppByName(pool, appName)
        if (!app) throw new Error(`App '${appName}' not found:404`)
        const personAppIds = { person_id: person.id, app_id: app.id }
        const personApp = await sqlFindOrCreate(pool, 'person_app', personAppIds, personAppIds, { debug: true })
        res.json({ personApp })
      } else {
        throw new Error(`${method} method not allowed:405`)
      }
    }, release, res)
  })
}
