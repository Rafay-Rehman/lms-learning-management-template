import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Preferences, Theme } from '@/types'
import { createSeed, DATA_VERSION } from '@/data/seed'
import { load, remove, save } from '@/services/persistence'
import { applyTheme, resolveDark, sanitizeTheme } from '@/services/theme'
import { createActions, type Actions } from './actions'

// The single source of truth. Pages read `data` and call `actions`; nothing
// else mutates state or touches storage.
//
// To connect a backend, make the actions call your API and hydrate `data`
// from the server instead of localStorage (src/services/persistence.ts).

export const defaultPrefs: Preferences = { mode: null, sidebarCollapsed: null, reducedMotion: false, largeText: false }

const LISTS: (keyof AppData)[] = ['users', 'courses', 'enrollments', 'quizzes', 'attempts', 'subjects', 'academicYears', 'terms', 'notifications', 'certificates', 'events', 'bank', 'assignments', 'submissions', 'groups', 'categories', 'reviews', 'announcements', 'audit', 'faculties', 'departments', 'subjectCategories', 'comments']
/** Stored data must be the current version with every collection present; anything else is replaced by fresh demo data. */
export const isData = (v: unknown): v is AppData =>
  typeof v === 'object' && v !== null && (v as AppData).version === DATA_VERSION && LISTS.every((k) => Array.isArray((v as AppData)[k])) && typeof (v as AppData).settings === 'object' && typeof (v as AppData).website === 'object'
const isObject = (v: unknown): v is Partial<Preferences> => typeof v === 'object' && v !== null

interface Store {
  data: AppData
  actions: Actions
  prefs: Preferences
  setPrefs: (patch: Partial<Preferences>) => void
  /** Unsaved theme being edited on the Theme & Branding page (null when none). */
  themeDraft: Theme | null
  setThemeDraft: (t: Theme | null) => void
  /** Whether draft edits apply to the whole app as you edit (otherwise only after "Apply"). */
  liveTheme: boolean
  setLiveTheme: (v: boolean) => void
  /** Pushes the draft to the whole app when live updates are off. */
  applyDraft: () => void
  /** The theme currently shown: the applied draft, or the saved theme. */
  theme: Theme
  dark: boolean
  /** False when the browser refused to save (private mode, quota). */
  persisted: boolean
  /** Set when stored data was missing, outdated or damaged and the demo data was restored. */
  recovered: boolean
}

const StoreContext = createContext<Store | null>(null)

function initialData(): [AppData, boolean] {
  let raw: unknown = null
  try {
    raw = JSON.parse(localStorage.getItem('lectern:data') ?? 'null')
  } catch {
    raw = 'invalid'
  }
  const stored = load('data', isData)
  if (stored) return [{ ...stored, theme: sanitizeTheme(stored.theme) }, false]
  // Something was stored but it's unusable (old version, hand-edited, corrupted).
  if (raw !== null) remove('data')
  return [createSeed(), raw !== null]
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [[data, recovered], setState] = useState<[AppData, boolean]>(initialData)
  const [prefs, setPrefsState] = useState<Preferences>(() => ({ ...defaultPrefs, ...(load('prefs', isObject) ?? {}) }))
  const [themeDraft, setThemeDraft] = useState<Theme | null>(null)
  const [liveTheme, setLiveTheme] = useState(true)
  const [appliedDraft, setAppliedDraft] = useState<Theme | null>(null)
  const [persisted, setPersisted] = useState(true)
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)

  // `ref` updates synchronously on commit so consecutive actions in one handler see each other's changes.
  const ref = useRef(data)
  const actions = useMemo(
    () =>
      createActions(
        () => ref.current,
        (next) => {
          ref.current = next
          setState(([, r]) => [next, r])
        },
      ),
    [],
  )

  useEffect(() => setPersisted(save('data', data)), [data])
  useEffect(() => void save('prefs', prefs), [prefs])
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSystemDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Live mode applies the draft as it changes; otherwise only when "Apply" pins it.
  useEffect(() => {
    if (!themeDraft) setAppliedDraft(null)
    else if (liveTheme) setAppliedDraft(themeDraft)
  }, [themeDraft, liveTheme])

  const theme = appliedDraft ?? data.theme
  const dark = resolveDark(prefs.mode ?? theme.mode, systemDark)
  useEffect(() => {
    const vars = applyTheme(document.documentElement, theme, dark, { largeText: prefs.largeText, reducedMotion: prefs.reducedMotion })
    document.documentElement.lang = data.settings.language
    // Cached so index.html can paint the right colors before React loads.
    if (!appliedDraft) save('paint', { vars, dark, header: theme.headerStyle })
  }, [theme, dark, prefs.largeText, prefs.reducedMotion, appliedDraft, data.settings.language])

  useEffect(() => {
    document.title = `${data.settings.name} — Learning`
    const link = document.querySelector<HTMLLinkElement>('link[rel=icon]')
    if (link) link.href = data.settings.favicon ?? '/favicon.svg'
  }, [data.settings.name, data.settings.favicon])

  const value = useMemo<Store>(
    () => ({
      data, actions, prefs, persisted, recovered, theme, dark, themeDraft, liveTheme,
      setPrefs: (patch) => setPrefsState((p) => ({ ...p, ...patch })),
      setThemeDraft,
      setLiveTheme,
      applyDraft: () => setAppliedDraft(themeDraft),
    }),
    [data, actions, prefs, persisted, recovered, theme, dark, themeDraft, liveTheme],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
