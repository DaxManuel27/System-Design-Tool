import express from 'express'
import cors from 'cors'
import { chatRouter } from './routes/chat'

// ─── API key check ────────────────────────────────────────────────────────────

// TODO: swap back to ANTHROPIC_API_KEY once Anthropic integration is restored
if (!process.env.GEMINI_API_KEY) {
  console.error('[server] ERROR: GEMINI_API_KEY is not set. Set it in .env or as an environment variable.')
  process.exit(1)
}

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/chat', chatRouter)

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`)
})
