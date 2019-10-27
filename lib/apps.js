const { sql: { sqlFind } } = require('sql-wizard')

module.exports.getAppByName = async (pool, name) => {
  const apps = await sqlFind(pool, 'app', { name })
  return (apps !== undefined) ? apps[0] : undefined
}
