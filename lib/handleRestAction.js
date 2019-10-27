module.exports = async (action, release, res) => {
  try {
    await action()
  } catch (err) {
    const message = err.message.split(':')[0]
    const status = err.message.split(':')[1] || 500
    console.error(`Error ${status}: ${message}`)
    res.status(status)
    res.json({ message, status })
  } finally {
    await release(true)
  }
}
