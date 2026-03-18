/**
 * Client-side PDF generation utility.
 *
 * Strategy — per-page DOM capture:
 *   • Each PDF page is built as a separate fixed-size (A4) off-screen div.
 *   • Header appears ONLY on page 1 (letterhead).
 *   • Footer appears on EVERY page (fixed to the bottom of each page div).
 *   • Content is cloned for each page and translated upward by a computed
 *     offset so that overflow:hidden on the clip container shows only the
 *     slice belonging to that page.
 *   • html2canvas-pro captures each page div — it handles Tailwind v4's
 *     modern CSS color functions (lab, oklch, oklab) that plain html2canvas
 *     cannot parse.
 *   • jsPDF assembles the per-page JPEG images into an A4 PDF.
 *
 * Dynamic imports keep jsPDF / html2canvas-pro out of the SSR bundle.
 */

export interface DietitianPDFData {
  name: string
  qualification: string
  licenseNumber: string
  clinicName: string
  address: string
  phone: string
  email?: string
  logoUrl?: string
}

export interface DownloadPDFInput {
  docTitle: string
  dietitian: DietitianPDFData
  /** The mounted preview container DOM element obtained from a React ref. */
  previewElement: HTMLElement
}

export interface GeneratedPDFResult {
  blob: Blob
  filename: string
}

// ── A4 page geometry (pixels at 96 dpi) ───────────────────────────────────
const PAGE_W = 794   // 210 mm at 96 dpi
const PAGE_H = 1123  // 297 mm at 96 dpi
const MARGIN_X = 48  // left / right padding (px)
const MARGIN_Y = 36  // top / bottom padding (px)
const CONTENT_W = PAGE_W - MARGIN_X * 2   // 698 px

// ── Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTimestamp(): string {
  const d = new Date()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const h24 = d.getHours()
  const h12 = h24 % 12 || 12
  const min = d.getMinutes().toString().padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} | ${h12}:${min} ${ampm}`
}

/**
 * Renders an HTML string inside a hidden div of the given width and returns
 * its scrollHeight so we can calculate per-page content slice sizes.
 */
async function measureHtml(html: string, width: number): Promise<number> {
  const div = document.createElement('div')
  div.style.cssText = `position:absolute;top:-99999px;left:0;width:${width}px;font-family:Inter,Helvetica,Arial,sans-serif;`
  div.innerHTML = html
  document.body.appendChild(div)
  await new Promise<void>((r) => setTimeout(r, 30))
  const h = div.scrollHeight
  document.body.removeChild(div)
  return h
}

interface LayoutMetrics {
  height: number
  breakpoints: number[]
}

/**
 * Measures the cloned preview content and captures candidate breakpoints so
 * long documents can flow between pages without cutting section blocks.
 */
async function measureElementLayout(el: HTMLElement, width: number): Promise<LayoutMetrics> {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `position:absolute;top:-99999px;left:0;width:${width}px;`

  const cloned = el.cloneNode(true) as HTMLElement
  enhancePreviewClone(cloned)
  wrapper.appendChild(cloned)

  document.body.appendChild(wrapper)
  await new Promise<void>((r) => setTimeout(r, 30))

  const breakpoints = Array.from(cloned.querySelectorAll<HTMLElement>('[data-pdf-block]'))
    .map((node) => Math.max(node.offsetTop - 8, 0))
    .filter((value, idx, arr) => idx === 0 || value !== arr[idx - 1])

  const height = wrapper.scrollHeight
  document.body.removeChild(wrapper)

  return { height, breakpoints }
}

// ── Header / Footer HTML builders ─────────────────────────────────────────

/** Center-aligned clinical letterhead (page 1 only). */
function buildHeaderHTML(d: DietitianPDFData): string {
  const safeLogo = d.logoUrl ? escapeHtml(d.logoUrl) : ''
  const rightRows: string[] = []

  if (d.name) {
    rightRows.push(`<div style="font-size:24px;line-height:1.1;font-weight:800;text-transform:uppercase;color:#111111;">${escapeHtml(d.name)}</div>`)
  }
  if (d.qualification) {
    rightRows.push(`<div style="font-size:12px;line-height:1.2;font-weight:400;color:#202020;margin-top:2px;">${escapeHtml(d.qualification)}</div>`)
  }
  if (d.licenseNumber) {
    rightRows.push(`<div style="font-size:12px;line-height:1.2;font-weight:400;color:#202020;margin-top:1px;">License No: ${escapeHtml(d.licenseNumber)}</div>`)
  }
  if (d.email) {
    rightRows.push(`<div style="font-size:12px;line-height:1.2;font-weight:400;color:#202020;margin-top:1px;">${escapeHtml(d.email)}</div>`)
  }

  const logoColumn = safeLogo
    ? `<div style="width:84px;height:84px;display:flex;align-items:center;justify-content:flex-start;"><img src="${safeLogo}" alt="Practice Logo" style="max-width:76px;max-height:76px;object-fit:contain;display:block;" /></div>`
    : '<div style="width:84px;height:84px;"></div>'

  return [
    '<div style="padding-bottom:12px;">',
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">',
    logoColumn,
    `<div style="flex:1;text-align:right;">${rightRows.join('')}</div>`,
    '</div>',
    '</div>',
  ].join('')
}

/** Center-aligned footer repeated on every page. */
function buildFooterHTML(d: DietitianPDFData, timestamp: string): string {
  const rows: string[] = []
  if (d.address) {
    rows.push(`<div style="font-size:11px;line-height:1.35;color:#1f1f1f;font-weight:400;word-wrap:break-word;overflow-wrap:break-word;">${escapeHtml(d.address)}</div>`)
  }
  rows.push(`<div style="font-size:10px;line-height:1.35;color:#2a2a2a;margin-top:4px;">Generated on ${escapeHtml(timestamp)}</div>`)
  rows.push('<div style="font-size:10px;line-height:1.35;color:#2a2a2a;">This is a digitally created document and requires no physical signature.</div>')
  rows.push('<div style="font-size:10px;line-height:1.35;color:#2a2a2a;font-weight:700;">Powered by Peepal</div>')
  return `<div style="border-top:1px solid #2e2e2e;padding-top:8px;text-align:center;">${rows.join('')}</div>`
}

// ── Preview content enhancements ──────────────────────────────────────────

/**
 * Applies inline style overrides directly to the cloned preview DOM node.
 * The original preview element in the composer is never modified.
 *
 * Changes applied:
 *   - Document title (h2): centered, bold, uppercase, prominent size
 *   - Section headings (h3): bold, uppercase, dark color
 *   - Root font-family: Inter
 */
function enhancePreviewClone(el: HTMLElement): void {
  // Avoid double borders/background when each PDF page draws its own rounded container.
  el.classList.remove('rounded-lg', 'border', 'bg-white', 'shadow-sm')
  el.style.border = 'none'
  el.style.borderRadius = '0'
  el.style.backgroundColor = 'transparent'

  el.style.fontFamily = 'Inter,Helvetica,Arial,sans-serif'
  el.style.color = '#111111'

  el.querySelectorAll('.pdf-section').forEach((node) => {
    const section = node as HTMLElement
    section.style.breakInside = 'avoid'
    section.style.pageBreakInside = 'avoid'
    section.style.marginTop = '12px'
    section.style.marginBottom = '0'
  })

  const h2 = el.querySelector('h2') as HTMLElement | null
  if (h2) {
    h2.style.textAlign = 'center'
    h2.style.fontWeight = '700'
    h2.style.textTransform = 'uppercase'
    h2.style.fontSize = '19px'
    h2.style.color = '#111111'
    h2.style.letterSpacing = '0.03em'
    h2.style.marginTop = '8px'
    h2.style.marginBottom = '16px'
  }

  el.querySelectorAll('h3').forEach((node) => {
    const h = node as HTMLElement
    h.style.fontWeight = '700'
    h.style.textTransform = 'uppercase'
    h.style.fontSize = '12px'
    h.style.color = '#111111'
    h.style.letterSpacing = '0.02em'
    h.style.marginTop = '10px'
    h.style.marginBottom = '4px'
  })

  el.querySelectorAll('p').forEach((node) => {
    const p = node as HTMLElement
    p.style.fontSize = '12px'
    p.style.lineHeight = '1.5'
    if (p.classList.contains('font-bold') || p.classList.contains('font-semibold')) {
      p.style.fontWeight = '700'
    } else if (p.classList.contains('font-medium')) {
      p.style.fontWeight = '500'
    } else {
      p.style.fontWeight = '400'
    }
    p.style.color = '#111111'
    p.style.marginTop = '0'
    p.style.marginBottom = '0'
  })

  el.querySelectorAll('.text-muted-foreground').forEach((node) => {
    const m = node as HTMLElement
    m.style.color = '#2f2f2f'
  })
}

function computeSliceStarts(contentH: number, sliceHP1: number, sliceHRest: number, breakpoints: number[]): number[] {
  if (contentH <= sliceHP1) return [0]

  const starts = [0]
  const minChunk = 120
  let pageIndex = 0

  while (true) {
    const currentStart = starts[starts.length - 1]
    const maxChunk = pageIndex === 0 ? sliceHP1 : sliceHRest
    const defaultNext = currentStart + maxChunk

    if (defaultNext >= contentH) break

    const minAllowedBreak = currentStart + minChunk
    const candidate = breakpoints
      .filter((bp) => bp > minAllowedBreak && bp <= defaultNext)
      .pop()

    const nextStart = candidate ?? defaultNext

    if (nextStart <= currentStart) break

    starts.push(nextStart)
    pageIndex += 1

    if (starts.length > 250) break
  }

  return starts
}

// ── Main export ───────────────────────────────────────────────────────────

function buildPDFFileName(docTitle: string): string {
  return docTitle.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_') || 'document'
}

async function generateDocumentPDF(input: DownloadPDFInput): Promise<GeneratedPDFResult> {
  const { docTitle, dietitian, previewElement } = input
  const timestamp = formatTimestamp()

  // Dynamic import — deferred until first call, not in SSR bundle
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ])

  const headerHTML = buildHeaderHTML(dietitian)
  const footerHTML = buildFooterHTML(dietitian, timestamp)

  // Measure component heights so we can calculate content slice sizes
  const [headerH, footerH, contentLayout] = await Promise.all([
    measureHtml(headerHTML, CONTENT_W),
    measureHtml(footerHTML, CONTENT_W),
    measureElementLayout(previewElement, CONTENT_W),
  ])
  const contentH = contentLayout.height

  // Pixel positions (from page top) for content area boundaries
  const HEADER_GAP = 14   // vertical gap between header divider and first content line
  const FOOTER_GAP = 8    // vertical gap between last content line and footer divider

  const contentTopP1   = MARGIN_Y + headerH + HEADER_GAP  // page 1 (below header)
  const contentTopRest = MARGIN_Y                           // pages 2+ (below top margin)
  const footerTopPx    = PAGE_H - MARGIN_Y - footerH        // where footer div starts

  const sliceHP1   = Math.max(footerTopPx - FOOTER_GAP - contentTopP1, 80)
  const sliceHRest = Math.max(footerTopPx - FOOTER_GAP - contentTopRest, 80)

  const sliceStarts = computeSliceStarts(contentH, sliceHP1, sliceHRest, contentLayout.breakpoints)
  const totalPages = sliceStarts.length

  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfW = pdf.internal.pageSize.getWidth()   // 210 mm
  const pdfH = pdf.internal.pageSize.getHeight()  // 297 mm

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    // How many pixels of content have already been shown on previous pages
    const sliceOffset = sliceStarts[pageIdx] ?? 0
    const contentTop  = pageIdx === 0 ? contentTopP1 : contentTopRest
    const clipH       = Math.max(footerTopPx - FOOTER_GAP - contentTop, 50)

    // ── Off-screen A4 page container ─────────────────────────────────
    const pageDiv = document.createElement('div')
    pageDiv.style.cssText = [
      'position:absolute',
      'top:-99999px',
      'left:0',
      `width:${PAGE_W}px`,
      `height:${PAGE_H}px`,
      'overflow:hidden',
      'background:#ffffff',
      'font-family:Inter,Helvetica,Arial,sans-serif',
      'box-sizing:border-box',
    ].join(';')

    // Header — letterhead, FIRST PAGE ONLY
    if (pageIdx === 0) {
      const hDiv = document.createElement('div')
      hDiv.style.cssText = `position:absolute;top:${MARGIN_Y}px;left:${MARGIN_X}px;right:${MARGIN_X}px;`
      hDiv.innerHTML = headerHTML
      pageDiv.appendChild(hDiv)
    }

    // Content clip — overflow:hidden hides the out-of-slice portions
    const clipDiv = document.createElement('div')
    clipDiv.style.cssText = [
      'position:absolute',
      `top:${contentTop}px`,
      `left:${MARGIN_X}px`,
      `right:${MARGIN_X}px`,
      `height:${clipH}px`,
      'overflow:hidden',
      'border:1px solid #e5e7eb',
      'border-radius:10px',
      'background:#ffffff',
      'box-sizing:border-box',
    ].join(';')

    // Inner wrapper: translated up by sliceOffset to expose the correct slice
    const innerDiv = document.createElement('div')
    innerDiv.style.cssText = `position:relative;top:${-sliceOffset}px;width:100%;`
    const cloned = previewElement.cloneNode(true) as HTMLElement
    enhancePreviewClone(cloned)
    innerDiv.appendChild(cloned)
    clipDiv.appendChild(innerDiv)
    pageDiv.appendChild(clipDiv)

    // Footer — EVERY PAGE, absolutely positioned at the bottom
    const fDiv = document.createElement('div')
    fDiv.style.cssText = `position:absolute;bottom:${MARGIN_Y}px;left:${MARGIN_X}px;right:${MARGIN_X}px;`
    fDiv.innerHTML = footerHTML
    pageDiv.appendChild(fDiv)

    document.body.appendChild(pageDiv)

    try {
      // Let the browser compute layout before html2canvas reads bounding rects
      await new Promise<void>((r) => setTimeout(r, 50))

      const canvas = await html2canvas(pageDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: PAGE_W,
        width: PAGE_W,
        height: PAGE_H,
      })

      if (pageIdx > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, pdfW, pdfH)
    } finally {
      document.body.removeChild(pageDiv)
    }
  }

  const filename = buildPDFFileName(docTitle)
  return { blob: pdf.output('blob'), filename }
}

/**
 * Builds one PDF page at a time as a fixed A4-sized off-screen DOM node,
 * captures it with html2canvas-pro, then assembles into a jsPDF document.
 *
 * Must be called from a browser environment (not during SSR).
 */
export async function downloadDocumentAsPDF(input: DownloadPDFInput): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }

  const { blob, filename } = await generateDocumentPDF(input)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${filename}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

/**
 * Generates the PDF and returns a Blob for upload workflows.
 * Must be called from a browser environment (not during SSR).
 */
export async function generateDocumentAsPDFBlob(input: DownloadPDFInput): Promise<GeneratedPDFResult> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }
  return generateDocumentPDF(input)
}


