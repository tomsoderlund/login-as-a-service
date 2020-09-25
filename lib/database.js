const { Pool } = require('pg')

const { config } = require('../config/config')
const pool = new Pool({ connectionString: config.databaseUrl })

// const results = await runDatabaseFunction(async (pool) => { ... })
const runDatabaseFunction = async function (functionToRun) {
  // Connect db
  const client = await pool.connect()
  // Run function
  const results = await functionToRun(client)
  // Release db
  await client.end()
  await client.release()
  return results
}

module.exports = {
  runDatabaseFunction
}
