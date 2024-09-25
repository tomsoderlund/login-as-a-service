const { Client } = require('pg')

const { config } = require('../config/config')

const postgresOptions = {
  connectionString: config.databaseUrl
  // max: 10, // default 10
  // connectionTimeoutMillis: 1000, // default 0 = no timeout
  // idleTimeoutMillis: 1000, // default 10000 ms
  // ssl: { rejectUnauthorized: false },
}

// const results = await runDatabaseFunction(async (pool) => { ... })
const runDatabaseFunction = async function (functionToRun) {
  // Connect db
  const client = new Client(postgresOptions)
  await client.connect()
  // Run function
  const results = await functionToRun(client)
  // Release db
  await client.end()
  return results
}

module.exports = {
  runDatabaseFunction
}
