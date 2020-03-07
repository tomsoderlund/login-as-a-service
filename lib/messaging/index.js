const jwt = require('jsonwebtoken')
const { sendEmail } = require('./email')

const generateToken = ({ user_id }, secret) => { // eslint-disable-line camelcase
  return jwt.sign({ user_id }, secret)
}

const getRandomString = (length = 5) => Math.round(Math.random() * Math.pow(10, length)).toString()

/*
<span style="color: #555555;">This email was sent because someone with this address requested to log in to ${app.name}.</span>
*/

module.exports.sendLoginMessage = async (app, person, personApp) => {
  const token = generateToken(personApp, app.secret)
  const messageId = getRandomString()
  const emailData = {
    from: `${app.name} <login@${app.email_domain}>`,
    to: person.email,
    subject: `Log in to ${app.name}`,
    html: `<body style="font-size: 12px; padding: 1em; text-align: left;">
<div style="display: inline-block; font-size: 2em; background-color: #00CED1; border-radius: 0.25em; padding: 0.5em 0.8em;">
<a href="${app.redirect_url}?token=${token}" target="_blank" style="color: #FFFFFF; text-decoration: none;">
Click here to log in to ${app.name}
</a>
</div>
<div style="margin-top: 1em; color: gray;">(id: ${messageId})</div>
</body>`,
    'o:tag': ['login-as-a-service', 'login-as-a-service_login'],
    'v:message-id': messageId
  }
  return sendEmail(emailData, { domain: app.email_domain })
}
