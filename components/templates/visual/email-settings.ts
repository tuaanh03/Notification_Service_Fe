import type { Component, Editor } from 'grapesjs'

/**
 * "Cài đặt thư" của bộ soạn trực quan — như phần Cài đặt của trình kéo-thả cũ (ADR-0034): rộng thư, màu nền
 * ngoài / trong, màu chữ, màu nút & link, font. Màu ở đây là màu của THƯ (dữ liệu người soạn, hex).
 *
 * Áp thẳng vào thuộc tính MJML của từng khối (không qua `mj-attributes` ở `<mj-head>`): khung soạn của
 * grapesjs-mjml dựng từng khối KHÔNG kèm phần head, nên chỉ thuộc tính trên chính khối mới hiện đúng trên khung.
 * Giá trị đang chọn lưu trong JSON dự án (`project.ewsSettings`) để mở lại đúng; khối thêm sau nhận giá trị này.
 */
export const EMAIL_FONTS = {
  sans: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'Courier New', Courier, monospace",
} as const
export type EmailFont = keyof typeof EMAIL_FONTS

export const EMAIL_WIDTHS = [480, 540, 600] as const

export type EmailSettings = {
  width: (typeof EMAIL_WIDTHS)[number]
  backgroundColor: string
  contentBackgroundColor: string
  textColor: string
  linkColor: string
  font: EmailFont
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  width: 600,
  backgroundColor: '#f1f5f9',
  contentBackgroundColor: '#ffffff',
  textColor: '#1e293b',
  linkColor: '#2563eb',
  font: 'sans',
}

/** Khoá trong JSON dự án — GrapesJS bỏ qua khoá lạ khi nạp. */
export const SETTINGS_KEY = 'ewsSettings'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function readSettings(project: Record<string, unknown> | undefined): EmailSettings {
  const raw = (project?.[SETTINGS_KEY] ?? {}) as Partial<Record<keyof EmailSettings, unknown>>
  const color = (value: unknown, fallback: string) => (typeof value === 'string' && HEX_RE.test(value) ? value : fallback)
  const d = DEFAULT_EMAIL_SETTINGS
  return {
    width: EMAIL_WIDTHS.find((w) => w === raw.width) ?? d.width,
    backgroundColor: color(raw.backgroundColor, d.backgroundColor),
    contentBackgroundColor: color(raw.contentBackgroundColor, d.contentBackgroundColor),
    textColor: color(raw.textColor, d.textColor),
    linkColor: color(raw.linkColor, d.linkColor),
    font: raw.font === 'serif' || raw.font === 'mono' ? raw.font : 'sans',
  }
}

const all = (editor: Editor, type: string): Component[] => editor.getWrapper()?.findType(type) ?? []

/**
 * Áp cài đặt vào thư. `changed` = chỉ những khoá vừa đổi (đổi màu chữ không ghi đè font người soạn đã đặt riêng);
 * bỏ trống = áp tất cả (dùng cho khối mới thêm qua `applySettingsTo`).
 */
export function applySettings(editor: Editor, settings: EmailSettings, changed: readonly (keyof EmailSettings)[]): void {
  const has = (key: keyof EmailSettings) => changed.includes(key)
  for (const body of all(editor, 'mj-body')) {
    if (has('width')) body.addAttributes({ width: `${settings.width}px` })
    if (has('backgroundColor')) body.addAttributes({ 'background-color': settings.backgroundColor })
  }
  if (has('contentBackgroundColor')) for (const s of all(editor, 'mj-section')) s.addAttributes({ 'background-color': settings.contentBackgroundColor })
  for (const text of all(editor, 'mj-text')) applyText(text, settings, has)
  for (const button of all(editor, 'mj-button')) applyButton(button, settings, has)
}

/** Khối vừa thêm (và mọi khối con của nó) nhận cài đặt hiện tại. */
export function applySettingsTo(component: Component, settings: EmailSettings): void {
  const every = () => true
  const visit = (c: Component) => {
    const type = c.get('type')
    if (type === 'mj-section') c.addAttributes({ 'background-color': settings.contentBackgroundColor })
    if (type === 'mj-text') applyText(c, settings, every)
    if (type === 'mj-button') applyButton(c, settings, every)
    c.components().forEach(visit)
  }
  visit(component)
}

function applyText(text: Component, s: EmailSettings, has: (key: keyof EmailSettings) => boolean): void {
  if (has('textColor')) text.addAttributes({ color: s.textColor })
  if (has('font')) text.addAttributes({ 'font-family': EMAIL_FONTS[s.font] })
}

function applyButton(button: Component, s: EmailSettings, has: (key: keyof EmailSettings) => boolean): void {
  if (has('linkColor')) button.addAttributes({ 'background-color': s.linkColor })
  if (has('font')) button.addAttributes({ 'font-family': EMAIL_FONTS[s.font] })
}
