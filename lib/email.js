const mailgun = require('mailgun-js')
const jwt = require('jsonwebtoken')

const generateToken = (person, secret) => {
  const { id } = person
  return jwt.sign({ id }, secret)
}

const getRandomString = (length = 5) => Math.round(Math.random() * Math.pow(10, length)).toString()

/*
<span style="color: #555555;">This email was sent because someone with this address requested to log in to ${app.name}.</span>
*/

module.exports.sendLoginEmail = async (app, person, personApp) => {
  const token = generateToken(person, personApp.secret)
  const emailData = {
    from: `${app.name} <login@${app.email_domain}>`,
    to: person.email,
    subject: `Log in to ${app.name}`,
    html: `<body style="font-size: 12px; padding: 1em; text-align: left;">
<div style="font-size: 2em; background-color: #00CED1; border-radius: 0.25em; padding: 0.5em;">
<a href="${app.redirect_url}?token=${token}" target="_blank" style="color: #FFFFFF; text-decoration: none;">
Click here to log in to ${app.name}
</a>
</div>
</body>`,
    'o:tag': ['login-as-a-service', 'login-as-a-service_login'],
    'v:message-id': getRandomString()
  }
  const mailgunConfig = {
    apiKey: process.env.MAILGUN_KEY,
    host: 'api.eu.mailgun.net',
    domain: app.email_domain,
    testMode: false
  }
  const mailgunClient = mailgun(mailgunConfig)
  // console.log(`getEmailPreview (${app.email_domain}):\n`, getEmailPreview(emailData))
  console.log(`\nSending email #${emailData['v:message-id']}: “${emailData.subject}”`)
  // mailgunSendMessage(emailData, mailgunConfig)
  mailgunClient.messages().send(emailData, (error, body) => console.log({ error, body }))
  // console.log('getCurl:\n', getCurl(emailData, mailgunConfig))
}

/*
const getEmailPreview = emailData => `------------------------------
from: ${emailData.from} | reply-to: ${emailData['h:Reply-To']}
to: ${emailData.to}
bcc: ${emailData.bcc}
tags: [${emailData['o:tag'].join(', ')}]
------------------------------
subject: ${emailData.subject}
------------------------------
${emailData.html.replace(/<br\/>/g, '\n')}`

const getCurl = (emailData, mailgunConfig) => `------------------------------
curl --user 'api:${mailgunConfig.apiKey}' \\
https://${mailgunConfig.host}/v3/${mailgunConfig.domain}/messages \\
--form from='${emailData.from}' \\
--form to='curl <${emailData.to}>' \\
--form subject='${emailData.subject} (curl)' \\
--form-string html='${emailData.html}'
------------------------------`
*/
