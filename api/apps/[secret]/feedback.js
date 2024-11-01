const { sql: { sqlFind } } = require('sql-wizard')

const { handleRequest } = require('../../../lib/handleRestAction')
const { runDatabaseFunction } = require('../../../lib/database')

module.exports = async (req, res) => handleRequest(async (req, res) => runDatabaseFunction(async (pool) => {
  const { query: { secret } } = req
  const people = await sqlFind(pool, 'view_feedback', { secret }, { sort: 'date_created desc' })
  res.json(people)
}), { req, res })
