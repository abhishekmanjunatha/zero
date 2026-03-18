import { execFile as execFileCallback } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

const MIN_SAVINGS_RATIO = 0.95
const SKIP_OPTIMIZE_BELOW_BYTES = 1024 * 1024

type OptimizerResult = {
  buffer: Uint8Array
  optimized: boolean
  method?: 'ghostscript' | 'qpdf'
}

async function runBinary(command: string, args: string[]) {
  await execFile(command, args, {
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
}

async function readIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

async function optimizeWithGhostscript(inputPath: string, outputPath: string) {
  const ghostscriptCommands =
    process.platform === 'win32' ? ['gswin64c', 'gswin32c', 'gs'] : ['gs']

  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.6',
    '-dPDFSETTINGS=/ebook',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-dDetectDuplicateImages=true',
    '-dCompressFonts=true',
    '-dSubsetFonts=true',
    '-dDownsampleColorImages=true',
    '-dColorImageResolution=170',
    '-dDownsampleGrayImages=true',
    '-dGrayImageResolution=170',
    '-dDownsampleMonoImages=true',
    '-dMonoImageResolution=300',
    `-sOutputFile=${outputPath}`,
    inputPath,
  ]

  for (const cmd of ghostscriptCommands) {
    try {
      await runBinary(cmd, args)
      const optimized = await readIfExists(outputPath)
      if (optimized) return optimized
    } catch {
      // Try the next binary candidate.
    }
  }

  return null
}

async function optimizeWithQpdf(inputPath: string, outputPath: string) {
  const args = ['--stream-data=compress', '--recompress-flate', '--object-streams=generate', inputPath, outputPath]

  try {
    await runBinary('qpdf', args)
    return await readIfExists(outputPath)
  } catch {
    return null
  }
}

export async function optimizePdfBuffer(input: Uint8Array): Promise<OptimizerResult> {
  if (input.length < SKIP_OPTIMIZE_BELOW_BYTES) {
    return { buffer: input, optimized: false }
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'peepal-pdf-'))
  const inputPath = path.join(workDir, 'input.pdf')
  const gsOutputPath = path.join(workDir, 'output-gs.pdf')
  const qpdfOutputPath = path.join(workDir, 'output-qpdf.pdf')

  try {
    await fs.writeFile(inputPath, input)

    const gsResult = await optimizeWithGhostscript(inputPath, gsOutputPath)
    if (gsResult && gsResult.length < input.length * MIN_SAVINGS_RATIO) {
      return { buffer: gsResult, optimized: true, method: 'ghostscript' }
    }

    const qpdfResult = await optimizeWithQpdf(inputPath, qpdfOutputPath)
    if (qpdfResult && qpdfResult.length < input.length * MIN_SAVINGS_RATIO) {
      return { buffer: qpdfResult, optimized: true, method: 'qpdf' }
    }

    return { buffer: input, optimized: false }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}
