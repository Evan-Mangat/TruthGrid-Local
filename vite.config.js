import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Busboy from 'busboy'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const OCR_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif'])
const MAX_OCR_UPLOAD_BYTES = 20 * 1024 * 1024

function offlineOcrPlugin() {
  return {
    name: 'truthgrid-offline-ocr',
    configureServer(server) {
      server.middlewares.use('/api/ocr', async (request, response) => {
        if (request.method !== 'POST') {
          response.writeHead(405, { Allow: 'POST' })
          response.end(JSON.stringify({ success: false, error: 'Use POST to upload a document.' }))
          return
        }

        let upload
        try {
          upload = await new Promise((resolve, reject) => {
            const parser = Busboy({
              headers: request.headers,
              limits: { files: 1, fileSize: MAX_OCR_UPLOAD_BYTES },
            })
            let fileCount = 0
            let tooLarge = false
            const chunks = []
            let filename = ''

            parser.on('file', (_fieldName, stream, info) => {
              fileCount += 1
              filename = path.basename(info.filename || '')
              stream.on('limit', () => { tooLarge = true })
              stream.on('data', chunk => chunks.push(chunk))
            })
            parser.on('filesLimit', () => reject(new Error('Upload one file at a time.')))
            parser.on('error', reject)
            parser.on('close', () => {
              if (tooLarge) return reject(new Error('File exceeds the 20 MB upload limit.'))
              if (fileCount !== 1) return reject(new Error('Choose a PDF or image file to scan.'))
              resolve({ filename, buffer: Buffer.concat(chunks) })
            })
            request.on('error', reject)
            request.pipe(parser)
          })

          const extension = path.extname(upload.filename).toLowerCase()
          if (!OCR_EXTENSIONS.has(extension)) {
            throw new Error('OCR supports PDF, PNG, JPG, JPEG, TIFF, and TIF files.')
          }

          const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'truthgrid-ocr-'))
          const inputPath = path.join(tempDirectory, `passage${extension}`)
          try {
            await new Promise((resolve, reject) => {
              const output = createWriteStream(inputPath)
              output.on('error', reject)
              output.on('finish', resolve)
              output.end(upload.buffer)
            })

            const pythonPath = path.join(server.config.root, '.venv', 'bin', 'python')
            const executable = process.platform === 'win32' ? 'python' : pythonPath
            const result = await new Promise((resolve, reject) => {
              const child = spawn(executable, [
                path.join(server.config.root, 'ocr_grader.py'),
                '--input', inputPath,
                '--json-stdout',
              ], { cwd: server.config.root, windowsHide: true })
              let stdout = ''
              let stderr = ''
              const timeout = setTimeout(() => child.kill('SIGTERM'), 60_000)
              child.stdout.setEncoding('utf8')
              child.stderr.setEncoding('utf8')
              child.stdout.on('data', data => { stdout += data })
              child.stderr.on('data', data => { stderr += data })
              child.on('error', error => {
                clearTimeout(timeout)
                reject(error)
              })
              child.on('close', code => {
                clearTimeout(timeout)
                try {
                  const payload = JSON.parse(stdout)
                  if (code !== 0 || !payload.success) {
                    const message = (payload.error || 'Offline OCR could not process this file.')
                      .replaceAll(inputPath, upload.filename)
                    return reject(new Error(message))
                  }
                  resolve(payload)
                } catch {
                  reject(new Error(code !== 0 ? 'Offline OCR could not process this file. Check that the document is valid and the required local OCR tools are installed.' : 'Offline OCR returned an invalid response.'))
                }
              })
            })

            response.writeHead(200, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify(result))
          } finally {
            await rm(tempDirectory, { recursive: true, force: true })
          }
        } catch (error) {
          response.writeHead(400, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify({ success: false, error: error.message || 'OCR upload failed.' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    offlineOcrPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'TruthGrid Classroom',
        short_name: 'TruthGrid',
        description: 'Literary analysis writing tool for BC secondary students',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
