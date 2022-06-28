const { sql: { sqlFind } } = require('sql-wizard')

const { handleRequest } = require('../../lib/handleRestAction')
const { runDatabaseFunction } = require('../../lib/database')

module.exports = async (req, res) => handleRequest(async (req, res) => runDatabaseFunction(async (pool) => {
  const apps = await sqlFind(
    pool,
    'app',
    undefined,
    {
      fields: ['slug', 'name', 'count(person.id) as signups'],
      join: ['person_app', 'person'],
      group: 'name',
      sort: 'people desc'
    }
  )
  const appsGroupedBySlug = apps.reduce((result, app) => ({
    ...result,
    [app.slug]: app
  }), {})
  res.json(appsGroupedBySlug)
}), { req, res })
