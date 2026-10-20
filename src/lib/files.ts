// Reads a user-chosen image into a data: URL for local storage. Only raster
// types (and SVG for logos, which is safe inside <img>) are accepted, and the
// result is only ever used as an <img src>, never injected as markup.

const MAX_BYTES = 600_000

export function readImage(file: File | undefined, allowSvg = false): Promise<{ url: string } | { error: string }> {
  const types = ['image/png', 'image/jpeg', 'image/webp', ...(allowSvg ? ['image/svg+xml'] : [])]
  if (!file) return Promise.resolve({ error: 'No file selected' })
  if (!types.includes(file.type)) return Promise.resolve({ error: `Use ${allowSvg ? 'SVG, ' : ''}PNG, JPEG or WebP` })
  if (file.size > MAX_BYTES) return Promise.resolve({ error: 'Image must be under 600 KB — browser storage is limited' })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.startsWith(`data:${file.type}`) ? { url } : { error: 'Couldn’t read that image' })
    }
    reader.onerror = () => resolve({ error: 'Couldn’t read that image' })
    reader.readAsDataURL(file)
  })
}
