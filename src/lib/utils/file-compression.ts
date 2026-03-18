import imageCompression from 'browser-image-compression'

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])

type CompressionKind = 'image' | 'passthrough'

export interface CompressionResult {
  file: File
  kind: CompressionKind
  originalBytes: number
  compressedBytes: number
}

function toJpegFileName(name: string) {
  return name.replace(/\.(png|jpe?g)$/i, '.jpg')
}

function createFileFromBlob(blob: Blob, name: string) {
  return new File([blob], name, {
    type: blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  })
}

export async function compressForLabUpload(file: File): Promise<CompressionResult> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return {
      file,
      kind: 'passthrough',
      originalBytes: file.size,
      compressedBytes: file.size,
    }
  }

  const firstPass = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2600,
    useWebWorker: true,
    initialQuality: 0.9,
    fileType: 'image/jpeg',
    preserveExif: false,
  })

  let output = createFileFromBlob(firstPass, toJpegFileName(file.name))

  const reductionRatio = output.size / file.size
  if (file.size > 2 * 1024 * 1024 && reductionRatio > 0.15) {
    const secondPass = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 2200,
      useWebWorker: true,
      initialQuality: 0.82,
      fileType: 'image/jpeg',
      preserveExif: false,
    })

    const secondOutput = createFileFromBlob(secondPass, toJpegFileName(file.name))
    if (secondOutput.size < output.size) {
      output = secondOutput
    }
  }

  if (output.size >= file.size) {
    return {
      file,
      kind: 'passthrough',
      originalBytes: file.size,
      compressedBytes: file.size,
    }
  }

  return {
    file: output,
    kind: 'image',
    originalBytes: file.size,
    compressedBytes: output.size,
  }
}

export async function compressForLogoUpload(file: File): Promise<CompressionResult> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return {
      file,
      kind: 'passthrough',
      originalBytes: file.size,
      compressedBytes: file.size,
    }
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    initialQuality: 0.88,
    fileType: 'image/jpeg',
    preserveExif: false,
  })

  const output = createFileFromBlob(compressed, toJpegFileName(file.name))

  if (output.size >= file.size) {
    return {
      file,
      kind: 'passthrough',
      originalBytes: file.size,
      compressedBytes: file.size,
    }
  }

  return {
    file: output,
    kind: 'image',
    originalBytes: file.size,
    compressedBytes: output.size,
  }
}
