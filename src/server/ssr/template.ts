export async function getHtmlTemplate(c: {
  env?: { ASSETS?: { fetch: (req: Request) => Promise<Response> } }
}): Promise<string> {
  if (c.env?.ASSETS) {
    const resp = await c.env.ASSETS.fetch(new Request('http://localhost/index.html'))
    return resp.text()
  }

  const fs = await import('node:fs')
  const path = await import('node:path')
  const candidate =
    path.resolve(process.cwd(), 'dist/client/index.html') ||
    path.resolve(process.cwd(), 'index.html')

  if (fs.existsSync(candidate)) {
    return fs.readFileSync(candidate, 'utf-8')
  }

  return fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8')
}
