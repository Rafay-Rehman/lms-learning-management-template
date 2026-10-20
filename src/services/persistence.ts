// Browser-local persistence for the demo. Everything lives in localStorage
// under the `lectern:` prefix. This gives no cross-device sync, no
// multi-user collaboration and no server-side security — swap these
// functions for API calls when connecting a backend.

const PREFIX = 'lectern:'

export function load<T>(key: string, validate: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    // Quota exceeded or storage disabled (private mode). The app keeps working in memory.
    return false
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}
