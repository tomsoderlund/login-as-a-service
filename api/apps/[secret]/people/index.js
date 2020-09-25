const { sql: { sqlFind } } = require('sql-wizard')

const { handleRequest } = require('../../../../lib/handleRestAction')
const { runDatabaseFunction } = require('../../../../lib/database')

module.exports = async (req, res) => handleRequest(async (req, res) => runDatabaseFunction(async (pool) => {
  const { query: { secret } } = req
  const people = await sqlFind(pool, 'app', { secret, fields: ['person.id', 'email', 'person.date_created', 'can_login'], join: ['person_app', 'person'], sort: 'person.date_created desc' })
  res.json(people)
}), { req, res })
