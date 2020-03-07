const mailgun = require('mailgun-js')

module.exports.sendEmail = (emailData, { domain }) => new Promise((resolve, reject) => {
  const mailgunConfig = {
    apiKey: process.env.MAILGUN_KEY,
    host: 'api.eu.mailgun.net',
    domain,
    testMode: false
  }
  const mailgunClient = mailgun(mailgunConfig)
  // console.log(`getEmailPreview (${domain}):\n`, getEmailPreview(emailData))
  // console.log('getCurl:\n', getCurl(emailData, mailgunConfig))
  console.log(`\nSending email (message-id: ${emailData['v:message-id']}): “${emailData.subject}”`)
  mailgunClient.messages().send(emailData, (err, body) => {
    if (err) reject(err)
    else resolve(Object.assign({}, body, { messageId: emailData['v:message-id'] }))
  })
})

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
