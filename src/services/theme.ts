import type { Palette, Theme } from '@/types'

// The theme system. A Theme (stored with the platform data) is turned into
// CSS custom properties on <html>; every component reads only those
// variables, so changing a token here restyles the whole application.
// Derived shades (hover, soft fills, faint text) are mixed in CSS from these
// base tokens — see src/styles/index.css.

export const FONTS = [
  { id: 'instrument', label: 'Instrument Sans', stack: "'Instrument Sans Variable', ui-sans-serif, system-ui, sans-serif" },
  { id: 'atkinson', label: 'Atkinson Hyperlegible', stack: "'Atkinson Hyperlegible Next Variable', ui-sans-serif, system-ui, sans-serif" },
  { id: 'literata', label: 'Literata (serif)', stack: "'Literata Variable', ui-serif, Georgia, serif" },
  { id: 'system', label: 'System UI', stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
  { id: 'georgia', label: 'Georgia (system serif)', stack: 'Georgia, "Times New Roman", serif' },
] as const

export const fontStack = (id: string) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).stack

export const COLOR_FIELDS: { key: keyof Palette; label: string; group: 'Brand' | 'Status' | 'Surfaces' | 'Sidebar' }[] = [
  { key: 'primary', label: 'Primary', group: 'Brand' },
  { key: 'secondary', label: 'Secondary', group: 'Brand' },
  { key: 'accent', label: 'Accent', group: 'Brand' },
  { key: 'link', label: 'Links', group: 'Brand' },
  { key: 'success', label: 'Success', group: 'Status' },
  { key: 'warning', label: 'Warning', group: 'Status' },
  { key: 'error', label: 'Error', group: 'Status' },
  { key: 'background', label: 'Page background', group: 'Surfaces' },
  { key: 'surface', label: 'Cards & panels', group: 'Surfaces' },
  { key: 'text', label: 'Text', group: 'Surfaces' },
  { key: 'muted', label: 'Secondary text', group: 'Surfaces' },
  { key: 'border', label: 'Borders', group: 'Surfaces' },
  { key: 'sidebar', label: 'Sidebar background', group: 'Sidebar' },
  { key: 'sidebarText', label: 'Sidebar text', group: 'Sidebar' },
]

const widgets = { activity: true, tasks: true, recommended: true, achievements: true, goal: true }

const base: Omit<Theme, 'presetId' | 'light' | 'dark' | 'mode'> = {
  font: 'instrument',
  headingFont: 'literata',
  fontScale: 1,
  density: 'comfortable',
  radius: 14,
  cardStyle: 'bordered',
  shadow: 'soft',
  buttonShape: 'rounded',
  sidebarStyle: 'brand',
  sidebarCollapsed: false,
  headerStyle: 'glass',
  contentWidth: 'wide',
  courseCard: 'detailed',
  reducedMotion: false,
  widgets,
}

const status = { success: '#22804f', warning: '#a86a0c', error: '#c43c2c' }
const statusDark = { success: '#5cc28a', warning: '#e2a743', error: '#f07c6c' }

export interface Preset {
  id: string
  name: string
  description: string
  theme: Theme
}

function preset(id: string, name: string, description: string, light: Omit<Palette, keyof typeof status>, dark: Omit<Palette, keyof typeof status>, extra: Partial<Theme> = {}): Preset {
  return { id, name, description, theme: { ...base, mode: 'light', ...extra, presetId: id, light: { ...status, ...light }, dark: { ...statusDark, ...dark } } }
}

export const PRESETS: Preset[] = [
  preset(
    'modern-indigo',
    'Modern Indigo',
    'Ink-blue navigation with an ultramarine primary.',
    { primary: '#3d41d6', secondary: '#0d7f89', accent: '#c9790f', link: '#3236c2', background: '#f5f5fa', surface: '#ffffff', text: '#1a1c32', muted: '#585c76', border: '#e1e1ec', sidebar: '#16193b', sidebarText: '#c5c8e6' },
    { primary: '#8e92ff', secondary: '#4cc3c9', accent: '#f0b04f', link: '#a8abff', background: '#0e1020', surface: '#161a2e', text: '#e8e9f5', muted: '#a3a6c2', border: '#2a2d48', sidebar: '#0a0c19', sidebarText: '#b9bcd9' },
  ),
  preset(
    'academic-blue',
    'Academic Blue',
    'Collegiate navy and a clear, confident blue.',
    { primary: '#1d5fbf', secondary: '#7a4fd0', accent: '#c98a12', link: '#1a55ab', background: '#f4f7fb', surface: '#ffffff', text: '#14233a', muted: '#4f5f76', border: '#dde4ee', sidebar: '#0f2742', sidebarText: '#bfd0e6' },
    { primary: '#6aa5ff', secondary: '#a98bf0', accent: '#eab24a', link: '#8dbaff', background: '#0b1422', surface: '#122033', text: '#e6edf7', muted: '#9fb0c6', border: '#22344d', sidebar: '#081120', sidebarText: '#b2c3da' },
  ),
  preset(
    'violet-learning',
    'Violet Learning',
    'Plum navigation, violet primary and a rose secondary.',
    { primary: '#6a3dd1', secondary: '#c4417f', accent: '#c47f16', link: '#5d32bf', background: '#f7f5fc', surface: '#ffffff', text: '#1f1733', muted: '#5f5675', border: '#e6e1f1', sidebar: '#24123f', sidebarText: '#d2c6ea' },
    { primary: '#b096ff', secondary: '#ef86b6', accent: '#f0b456', link: '#c3b0ff', background: '#120d1d', surface: '#1b1429', text: '#eee9f8', muted: '#ada3c2', border: '#30264a', sidebar: '#0d0817', sidebarText: '#c8bcdf' },
  ),
  preset(
    'emerald-academy',
    'Emerald Academy',
    'Deep green with a brass accent. Calm and traditional.',
    { primary: '#11735a', secondary: '#2d6893', accent: '#a87b1f', link: '#0d6650', background: '#f3f7f5', surface: '#ffffff', text: '#13241e', muted: '#4e6159', border: '#dbe5e0', sidebar: '#0e2f27', sidebarText: '#bcd6cb' },
    { primary: '#4fc79f', secondary: '#79acd6', accent: '#d9ad5a', link: '#7ad8b6', background: '#0b1613', surface: '#12201c', text: '#e4f0eb', muted: '#9db5ab', border: '#21352e', sidebar: '#07110e', sidebarText: '#aac7bb' },
    { headingFont: 'literata' },
  ),
  preset(
    'warm-neutral',
    'Warm Neutral',
    'Paper tones, slate ink and an ochre secondary.',
    { primary: '#2d4a6b', secondary: '#9c5b25', accent: '#5f7f51', link: '#2a4566', background: '#f6f4f0', surface: '#fffdf9', text: '#1f1d1a', muted: '#625d55', border: '#e5e0d6', sidebar: '#2a2723', sidebarText: '#d6cfc3' },
    { primary: '#8db3dc', secondary: '#d9965c', accent: '#9cbf8b', link: '#a6c4e4', background: '#151412', surface: '#1e1c19', text: '#eeeae3', muted: '#aaa398', border: '#33302b', sidebar: '#0f0e0c', sidebarText: '#c9c1b4' },
    { radius: 8, buttonShape: 'square', shadow: 'none', cardStyle: 'flat' },
  ),
  preset(
    'midnight-dark',
    'Midnight Dark',
    'Dark by default: deep navy surfaces with a sky-blue primary.',
    { primary: '#2563c9', secondary: '#0f8a80', accent: '#c7860f', link: '#1f57b3', background: '#f3f5f9', surface: '#ffffff', text: '#121a2b', muted: '#4f5a70', border: '#dce2ec', sidebar: '#0b1222', sidebarText: '#b9c4da' },
    { primary: '#6db3ff', secondary: '#3fd0c0', accent: '#f4b860', link: '#93c7ff', background: '#080d18', surface: '#0f1626', text: '#e7edf8', muted: '#9aa7c0', border: '#1e2a40', sidebar: '#050913', sidebarText: '#aebcd6' },
    { mode: 'dark', cardStyle: 'elevated', shadow: 'strong' },
  ),
]

export const DEFAULT_THEME: Theme = PRESETS[0].theme

// ——— Color math ———

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

/** Accepts #abc, abc, #aabbcc, aabbcc → '#aabbcc' or null. */
export function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(s)) s = [...s].map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : null
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)]
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

function luminance(hex: string) {
  const ch = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

export function contrastRatio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Readable text color on a filled background. */
export const onColor = (bg: string) => (contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111322') ? '#ffffff' : '#111322')

// ——— Validation ———

/** Repairs a stored or imported theme: unknown keys dropped, bad colors replaced by the default. */
export function sanitizeTheme(input: unknown): Theme {
  const t = (typeof input === 'object' && input ? input : {}) as Partial<Theme>
  const pal = (p: unknown, fallback: Palette): Palette => {
    const src = (typeof p === 'object' && p ? p : {}) as Record<string, unknown>
    return Object.fromEntries(Object.keys(fallback).map((k) => [k, isHex(src[k]) ? (src[k] as string).toLowerCase() : fallback[k as keyof Palette]])) as unknown as Palette
  }
  const pick = <K extends keyof Theme>(k: K, allowed: readonly Theme[K][]): Theme[K] => (allowed.includes(t[k] as Theme[K]) ? (t[k] as Theme[K]) : DEFAULT_THEME[k])
  const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)
  return {
    presetId: typeof t.presetId === 'string' ? t.presetId : 'custom',
    mode: pick('mode', ['light', 'dark', 'system']),
    light: pal(t.light, DEFAULT_THEME.light),
    dark: pal(t.dark, DEFAULT_THEME.dark),
    font: FONTS.some((f) => f.id === t.font) ? t.font! : DEFAULT_THEME.font,
    headingFont: FONTS.some((f) => f.id === t.headingFont) ? t.headingFont! : DEFAULT_THEME.headingFont,
    fontScale: num(t.fontScale, 0.9, 1.15, 1),
    density: pick('density', ['comfortable', 'compact']),
    radius: num(t.radius, 0, 24, DEFAULT_THEME.radius),
    cardStyle: pick('cardStyle', ['bordered', 'elevated', 'flat']),
    shadow: pick('shadow', ['none', 'soft', 'strong']),
    buttonShape: pick('buttonShape', ['rounded', 'pill', 'square']),
    sidebarStyle: pick('sidebarStyle', ['brand', 'dark', 'light']),
    sidebarCollapsed: t.sidebarCollapsed === true,
    headerStyle: pick('headerStyle', ['glass', 'solid']),
    contentWidth: pick('contentWidth', ['standard', 'wide', 'full']),
    courseCard: pick('courseCard', ['detailed', 'compact']),
    reducedMotion: t.reducedMotion === true,
    widgets: { ...widgets, ...(typeof t.widgets === 'object' && t.widgets ? t.widgets : {}) },
  }
}

// ——— Tokens ———

/** CSS variables for one resolved mode. */
export function themeVars(t: Theme, dark: boolean, largeText = false): Record<string, string> {
  const c = dark ? t.dark : t.light
  const navBg = t.sidebarStyle === 'brand' ? c.sidebar : t.sidebarStyle === 'dark' ? (dark ? '#05060b' : '#14161f') : c.surface
  const navInk = t.sidebarStyle === 'brand' ? c.sidebarText : t.sidebarStyle === 'dark' ? '#c4c6d4' : c.muted
  const navStrong = t.sidebarStyle === 'light' ? c.text : '#ffffff'
  const shadowA = t.shadow === 'none' ? 0 : t.shadow === 'soft' ? 1 : 2
  const k = dark ? 0.5 : 0.08
  const sm = shadowA ? `0 1px 2px rgb(10 12 30 / ${(k * 0.7).toFixed(2)})` : 'none'
  const md = shadowA ? `0 1px 2px rgb(10 12 30 / ${(k * 0.7).toFixed(2)}), 0 ${shadowA * 6}px ${shadowA * 14}px -8px rgb(10 12 30 / ${(k * shadowA * 1.4).toFixed(2)})` : 'none'
  const ctl = Math.round(Math.min(12, t.radius * 0.72))
  const size = (t.density === 'compact' ? 14 : 15) * t.fontScale * (largeText ? 1.1 : 1)
  return {
    '--bg': c.background,
    '--surface': c.surface,
    '--ink': c.text,
    '--muted': c.muted,
    '--line': c.border,
    '--primary': c.primary,
    '--primary-ink': onColor(c.primary),
    '--secondary': c.secondary,
    '--secondary-ink': onColor(c.secondary),
    '--highlight': c.accent,
    '--link': c.link,
    '--success': c.success,
    '--warning': c.warning,
    '--danger': c.error,
    '--nav': navBg,
    '--nav-ink': navInk,
    '--nav-strong': navStrong,
    '--nav-line': t.sidebarStyle === 'light' ? c.border : 'transparent',
    '--nav-hover': t.sidebarStyle === 'light' ? `color-mix(in oklab, ${c.text} 6%, transparent)` : 'rgb(255 255 255 / 0.06)',
    '--nav-active': t.sidebarStyle === 'light' ? `color-mix(in oklab, ${c.primary} 12%, transparent)` : 'rgb(255 255 255 / 0.11)',
    '--shadow-sm': sm,
    '--shadow-md': md,
    '--shadow-lg': `0 2px 6px rgb(10 12 30 / ${(k * 0.8).toFixed(2)}), 0 24px 56px -18px rgb(10 12 30 / ${(k * 3.5).toFixed(2)})`,
    '--card-border': t.cardStyle === 'elevated' ? 'transparent' : c.border,
    '--card-shadow': t.cardStyle === 'flat' ? 'none' : t.cardStyle === 'elevated' ? md : sm,
    '--radius': `${t.radius}px`,
    '--r-ctl': `${ctl}px`,
    '--r-btn': t.buttonShape === 'pill' ? '999px' : t.buttonShape === 'square' ? `${Math.min(ctl, 4)}px` : `${ctl}px`,
    '--font-body': fontStack(t.font),
    '--font-heading': fontStack(t.headingFont),
    '--content-max': t.contentWidth === 'standard' ? '1240px' : t.contentWidth === 'wide' ? '1520px' : '100%',
    'font-size': `${size.toFixed(2)}px`,
  }
}

export const resolveDark = (mode: Theme['mode'], systemDark: boolean) => mode === 'dark' || (mode === 'system' && systemDark)

/** Applies a theme to an element (normally <html>). Returns the variables for caching. */
export function applyTheme(el: HTMLElement, t: Theme, dark: boolean, opts: { largeText?: boolean; reducedMotion?: boolean } = {}) {
  const vars = themeVars(t, dark, opts.largeText)
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
  el.classList.toggle('dark', dark)
  el.dataset.header = t.headerStyle
  el.dataset.motion = t.reducedMotion || opts.reducedMotion ? 'reduced' : 'full'
  el.style.colorScheme = dark ? 'dark' : 'light'
  return vars
}
