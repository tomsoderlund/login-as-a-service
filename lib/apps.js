const { sql: { sqlFind } } = require('sql-wizard')

module.exports.getAppByName = async (pool, name) => {
  const apps = await sqlFind(pool, 'app', { name }, { debug: true })
  console.log('apps:', apps)
  return (apps !== undefined) ? apps[0] : undefined
}
