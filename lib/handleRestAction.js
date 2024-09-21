module.exports.setAccessControlHeaders = (res, methods = 'POST') => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', methods)
}

module.exports.handleRestAction = async (actionFunction, release, res) => {
  try {
    await actionFunction()
  } catch (err) {
    const message = err.message.split(':')[0]
    const status = err.message.split(':')[1] || 500
    console.error(`Error ${status}: ${message}`)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(status)
    res.json({ message, status })
  } finally {
    // Release database
    if (release) await release(true)
  }
}

/** handleRequest(async (req, res) => {...}, { req, res }) */
module.exports.handleRequest = async function handleRequest (actionFunction, { req, res }) {
  try {
    await actionFunction(req, res)
  } catch (error) {
    const reference = `E${Math.round(1000 * Math.random())}`
    const { message, status = 400 } = error
    console.error(`[${reference}] Error ${status}: “${message}” –`, error)
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!isNaN(status)) res.status(status)
    res.json({ status, message, reference })
  }
}

// From: https://levelup.gitconnected.com/the-definite-guide-to-handling-errors-gracefully-in-javascript-58424d9c60e6
/** throw new CustomError(`Account not found`, 404) */
module.exports.CustomError = class CustomError extends Error {
  constructor (message, status) {
    super(message)
    if (Error.captureStackTrace) Error.captureStackTrace(this, CustomError)
    this.status = status
  }
}

module.exports.getServerHref = (req) => `${req.headers.host.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/`
