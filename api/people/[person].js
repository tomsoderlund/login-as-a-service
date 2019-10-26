const { Pool } = require('pg')
const { sql: { sqlFind } } = require('sql-wizard')

const { config } = require('../../config/config')

module.exports = async (req, res) => {
  // const { method, url, body, query } = req
  const pool = new Pool({ connectionString: config.databaseUrl })
  pool.connect(async (err, client, release) => {
    try {
      if (err) throw new Error(err)
      const rows = await sqlFind(client, 'person')
      release()
      res.json(rows)
    }
    catch (err) {
      console.error(`Error: ${err.message || err}`)
      res.json(err)
    }
  })
}
