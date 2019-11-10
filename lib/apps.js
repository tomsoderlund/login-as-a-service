const { sql: { sqlFind } } = require('sql-wizard')

module.exports.getAppBySlug = async (pool, slug) => {
  const apps = await sqlFind(pool, 'app', { slug })
  return (apps !== undefined) ? apps[0] : undefined
}
