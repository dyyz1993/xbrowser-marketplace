export const TOTAL_LINES = 12

export const supportsFileSystemAccess = 'showSaveFilePicker' in window

export async function readStreamToLines(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onLine: (lineCount: number, line: string) => void,
): Promise<void> {
  const decoder = new TextDecoder()
  let lineCount = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.trim())

    for (const line of lines) {
      lineCount++
      onLine(lineCount, line)
    }
  }
}

type FileSystemWritable = {
  write: (data: Uint8Array) => Promise<void>
  close: () => Promise<void>
}

export async function readStreamToFileSystem(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  writable: FileSystemWritable,
  callbacks: {
    onLine: (line: string) => void
    onProgress: (progress: number) => void
  },
): Promise<void> {
  const decoder = new TextDecoder()
  let lineCount = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    await writable.write(value)

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.trim())

    for (const line of lines) {
      lineCount++
      callbacks.onLine(line)
      callbacks.onProgress(Math.round((lineCount / TOTAL_LINES) * 100))
    }
  }

  await writable.close()
}

export async function readStreamToBlob(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  contentLength: number,
  callbacks: {
    onProgress: (progress: number) => void
    onSpeed: (speed: string) => void
  },
): Promise<Blob> {
  const chunks: Uint8Array[] = []
  let receivedLength = 0
  const startTime = Date.now()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    receivedLength += value.length

    if (contentLength > 0) {
      callbacks.onProgress(Math.round((receivedLength / contentLength) * 100))
    }

    const elapsed = (Date.now() - startTime) / 1000
    const speed = (receivedLength / 1024 / elapsed).toFixed(1)
    callbacks.onSpeed(`${speed} KB/s`)
  }

  return new Blob(chunks)
}

export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
