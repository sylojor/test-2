// ============================================
// Bootstrap script — يمنع الـ unhandledRejection من تعطيل السيرفر
// ============================================

// منع الـ unhandled rejection من تعطيل العملية
process.on('unhandledRejection', (reason) => {
  console.warn('[UNHANDLED_REJECTION_CAUGHT]', String(reason))
})

process.on('uncaughtException', (err) => {
  console.warn('[UNCAUGHT_EXCEPTION_CAUGHT]', err?.message || String(err))
})

// تشغيل السيرفر
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
