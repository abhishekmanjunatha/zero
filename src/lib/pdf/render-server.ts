/**
 * Server-side Puppeteer PDF renderer.
 *
 * Launches headless Chromium (via @sparticuz/chromium for serverless compat),
 * renders a self-contained HTML string, and returns the PDF as a Buffer.
 *
 * Uses a singleton browser instance for efficiency across requests.
 */

import type { Browser } from 'puppeteer-core'

let browserInstance: Browser | null = null
let browserClosing = false

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }

  // Wait if a close operation is in progress
  if (browserClosing) {
    await new Promise<void>((resolve) => setTimeout(resolve, 200))
    return getBrowser()
  }

  const puppeteer = await import('puppeteer-core')

  let executablePath: string | undefined
  let args: string[] = []

  // In production / serverless, use @sparticuz/chromium
  // In development, look for a local Chrome installation
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // Common Chrome paths for development
    const possiblePaths = process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']

    const fs = await import('node:fs')
    executablePath = possiblePaths.find((p) => {
      try { return fs.existsSync(p) } catch { return false }
    })

    if (!executablePath) {
      throw new Error(
        'Chrome not found in common locations. Install Chrome or set CHROME_PATH env variable.'
      )
    }

    args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  } else {
    // Serverless: use @sparticuz/chromium
    const chromium = await import('@sparticuz/chromium')
    // Must set headless mode before calling executablePath() (required since v120+)
    chromium.default.setHeadlessMode = true
    executablePath = await chromium.default.executablePath()
    args = chromium.default.args
  }

  // Allow override via environment variable
  if (process.env.CHROME_PATH) {
    executablePath = process.env.CHROME_PATH
  }

  browserInstance = await puppeteer.default.launch({
    executablePath,
    args,
    headless: true,
    defaultViewport: null,
  })

  // Clean up on unexpected disconnect
  browserInstance.on('disconnected', () => {
    browserInstance = null
  })

  return browserInstance
}

export async function renderHTMLToPDF(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // 'domcontentloaded' is sufficient for self-contained HTML (no external resources)
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15_000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    })

    // puppeteer-core returns Uint8Array; ensure we return a Node Buffer
    return Buffer.from(pdfBuffer)
  } finally {
    await page.close()
  }
}

/**
 * Close the browser singleton. Call during graceful shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (!browserInstance) return
  browserClosing = true
  try {
    await browserInstance.close()
  } catch {
    // Ignore errors during cleanup
  } finally {
    browserInstance = null
    browserClosing = false
  }
}
