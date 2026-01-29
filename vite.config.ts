import { defineConfig, Plugin, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { AccessToken } from 'livekit-server-sdk'

// Load .env for server-side use
import dotenv from 'dotenv'
dotenv.config()

/**
 * Vite Plugin for local LiveKit token generation
 * Allows `npm run dev` to work without `vercel dev`
 */
function livekitTokenPlugin(): Plugin {
  return {
    name: 'livekit-token-dev',
    configureServer(server) {
      server.middlewares.use('/api/token', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 200
          res.end()
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        // Read request body
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { room, identity, metadata } = JSON.parse(body)

            const apiKey = process.env.LIVEKIT_API_KEY
            const apiSecret = process.env.LIVEKIT_API_SECRET

            if (!apiKey || !apiSecret) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in .env'
              }))
              return
            }

            const token = new AccessToken(apiKey, apiSecret, { identity })
            token.addGrant({
              room,
              roomJoin: true,
              canPublish: true,
              canSubscribe: true,
            })

            if (metadata) {
              token.metadata = JSON.stringify(metadata)
            }

            const jwt = await token.toJwt()

            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ token: jwt }))
          } catch (error) {
            console.error('[Token Plugin] Error:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to generate token' }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), livekitTokenPlugin()],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    assetsInlineLimit: 10240,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  }
})
