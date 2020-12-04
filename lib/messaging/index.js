const { sendEmail } = require('./email')
const { generateToken, getRandomString } = require('../tokens')

module.exports.sendLoginMessage = async (app, person, personApp) => {
  const token = generateToken(personApp, app)
  const messageId = getRandomString()
  const emailData = {
    from: `${app.name} <login@${app.email_domain || process.env.DEFAULT_EMAIL_DOMAIN}>`,
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
  return sendEmail(emailData, { domain: app.email_domain, apiKey: app.email_api_key, apiServer: app.email_api_server })
}
