const buckets = new Map()

const WINDOW_MS = Number(process.env.MESSAGE_RATE_WINDOW_MS || 60_000)
const MAX_MESSAGES = Number(process.env.MESSAGE_RATE_MAX || 20)

function messageRateLimit(req, res, next) {
  const auth = String(req.headers.authorization || '')
  const key = auth.startsWith('Bearer ')
    ? `user:${auth.slice(7, 35)}`
    : `ip:${req.ip || 'unknown'}`

  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 })
    return next()
  }

  bucket.count += 1
  if (bucket.count > MAX_MESSAGES) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - bucket.startedAt)) / 1000)
    res.setHeader('Retry-After', retryAfter)
    return res.status(429).json({
      error: 'Too many messages. Please wait and try again.'
    })
  }

  return next()
}

module.exports = { messageRateLimit }
