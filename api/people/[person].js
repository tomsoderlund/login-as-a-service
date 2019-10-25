const { Pool } = require('pg')
const { sql: { sqlFind } } = require('sql-wizard')

const { config } = require('../../config/config')
const pool = new Pool({ connectionString: config.databaseUrl })

module.exports = async (req, res) => {
  // const { method, url, body, query } = req
  const rows = await sqlFind(pool, 'person')
  res.json(rows)
}