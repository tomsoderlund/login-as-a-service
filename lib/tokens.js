const jwt = require('jsonwebtoken')

module.exports.generateToken = ({ user_id }, { secret }) => { // eslint-disable-line camelcase
  if (!user_id) throw new Error('Can’t generate login token – user ID not set') // eslint-disable-line camelcase
  return jwt.sign({ user_id }, secret)
}

module.exports.getRandomString = (length = 5) => Math.round(Math.random() * Math.pow(10, length)).toString()
