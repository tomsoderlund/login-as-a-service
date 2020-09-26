const { sql: { sqlFind } } = require('sql-wizard')

const { handleRequest } = require('../../lib/handleRestAction')
const { runDatabaseFunction } = require('../../lib/database')

module.exports = async (req, res) => handleRequest(async (req, res) => runDatabaseFunction(async (pool) => {
  const apps = await sqlFind(pool, 'app', undefined, { fields: ['name', 'count(person.id) as people'], join: ['person_app', 'person'], group: 'name', sort: 'people desc' })
  res.json(apps)
}), { req, res })
