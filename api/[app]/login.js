const { createPerson } = require('../../lib/data/people')

module.exports = createPerson.bind(undefined, 'login')
