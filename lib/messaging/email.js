const mailgun = require('mailgun-js')

// emailData: { from, 'h:Reply-To', to, cc, bcc, subject, html, text, 'o:tag': ['tag'], 'v:message-id' }
module.exports.sendEmail = (emailData, { domain, apiKey, apiServer }) => new Promise((resolve, reject) => {
  const mailgunConfig = {
    apiKey: apiKey || process.env.DEFAULT_EMAIL_API_KEY,
    domain: domain || process.env.DEFAULT_EMAIL_DOMAIN,
    host: apiServer || process.env.DEFAULT_EMAIL_API_SERVER,
    testMode: false
  }
  const mailgunClient = mailgun(mailgunConfig)
  // console.log(`getEmailPreview (${domain}):\n`, getEmailPreview(emailData))
  // console.log('getCurl:\n', getCurl(emailData, mailgunConfig))
  console.log(`\nSending email (message-id: ${emailData['v:message-id']}): “${emailData.subject}”`)
  mailgunClient.messages().send(emailData, (err, body) => {
    if (err) reject(new Error('Email problem - ' + err.message))
    else resolve(Object.assign({}, body, { messageId: emailData['v:message-id'] }))
  })
})

/*
const formatEmailAddress = (email, name) => name ? `${name} <${email}>` : email

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
