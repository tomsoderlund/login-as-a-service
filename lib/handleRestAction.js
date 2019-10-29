module.exports.setAccessControlHeaders = (res, methods = 'POST') => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', methods)
}

module.exports.handleRestAction = async (action, release, res) => {
  try {
    await action()
  } catch (err) {
    const message = err.message.split(':')[0]
    const status = err.message.split(':')[1] || 500
    console.error(`Error ${status}: ${message}`)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(status)
    res.json({ message, status })
  } finally {
    await release(true)
  }
}
