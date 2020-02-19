const fetch = require('node-fetch')

module.exports = function postWebhook (data) {
  if (process.env.WEBHOOK) {
    return fetch(process.env.WEBHOOK, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
  } else {
    console.warn('WEBHOOK not defined')
  }
}
