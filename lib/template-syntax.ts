import type { TemplateVariableDto } from '@/lib/api/types'

/**
 * Cú pháp biến của template — bản CHỈ ĐỂ XEM THỬ trên trình duyệt, sao theo backend
 * (`ews-astrolink-api/src/modules/templates/domain/rules/{template-variables,render-template}.ts`).
 *
 * Nguồn đúng vẫn là backend: xuất bản kiểm đủ luật và trả `issues`; gửi thật đổ biến ở backend.
 * File này chỉ để màn soạn tô màu biến và vẽ bản xem thử ngay khi gõ, không chờ mạng.
 *
 *   {{ payload.vm_name }}                        <- dữ liệu app gửi mỗi lần
 *   {{ payload.owner | default: "chưa rõ" }}     <- biến tuỳ chọn phải có default
 *   {{ user.external_id }}                       <- EWS tự điền mã người nhận
 */

/** Một `{{ ... }}` — cùng regex với backend. Có cờ `g`: chỉ dùng với `matchAll` / `replace`. */
export const VARIABLE_RE = /\{\{\s*([^}]+?)\s*\}\}/g

/** Biến `user.*` backend đã đổ được (ADR-0020); `user.tags.*` chưa có. */
export const SUPPORTED_USER_VARIABLES: readonly string[] = ['user.external_id']

export type ParsedVariable = { path: string; defaultValue: string | null; raw: string }

export function parseVariable(raw: string): ParsedVariable {
  const [path = '', ...filters] = raw.split('|').map((part) => part.trim())
  const filter = filters.find((f) => f.startsWith('default:'))
  let defaultValue: string | null = null
  if (filter !== undefined) {
    const value = filter.slice('default:'.length).trim()
    const quoted = /^(["'])([\s\S]*)\1$/.exec(value)
    defaultValue = quoted ? (quoted[2] ?? '') : value
  }
  return { path, defaultValue, raw }
}

export function parseVariables(body: string): ParsedVariable[] {
  return [...body.matchAll(VARIABLE_RE)].map((m) => parseVariable(m[1] ?? ''))
}

/** Đường dẫn biến dùng trong các đoạn nội dung — thứ tự gặp, không trùng. */
export function usedVariablePaths(...bodies: string[]): string[] {
  return [...new Set(bodies.flatMap((b) => parseVariables(b).map((v) => v.path)))]
}

/** Có nguồn hợp lệ không — `{{ vm_name }}` (thiếu `payload.`) backend từ chối lúc xuất bản. */
export const hasSource = (path: string) => path.startsWith('payload.') || path.startsWith('user.')

/** Nguồn suy từ tên — console không cho chọn riêng, lệch tên với nguồn là lỗi backend bắt. */
export const sourceOf = (path: string): TemplateVariableDto['source'] => (path.startsWith('user.') ? 'user' : 'payload')

const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch)

/**
 * Giá trị xem thử: `sample` đã khai, không có thì dùng `default:` trong nội dung, không có nữa thì
 * để nguyên `{{ ... }}` — người soạn thấy ngay chỗ còn thiếu, như backend sẽ từ chối.
 */
export function renderPreview(
  body: string,
  variables: readonly TemplateVariableDto[],
  opts: { escape: boolean; externalId?: string },
): string {
  const samples = new Map(variables.filter((v) => v.sample).map((v) => [v.name, v.sample!]))
  samples.set('user.external_id', opts.externalId ?? 'NV-0001')
  return body.replace(VARIABLE_RE, (match, raw: string) => {
    const v = parseVariable(raw)
    const value = samples.get(v.path) ?? v.defaultValue
    if (value === null || value === undefined) return match
    return opts.escape ? escapeHtml(value) : value
  })
}

/** Payload mẫu cho đội app: mọi biến `payload.*`, giá trị lấy từ `sample` (không có thì tên biến). */
export function samplePayload(variables: readonly TemplateVariableDto[]): Record<string, string> {
  return Object.fromEntries(
    variables
      .filter((v) => v.name.startsWith('payload.'))
      .map((v) => [v.name.slice('payload.'.length), v.sample || `<${v.name.slice('payload.'.length)}>`]),
  )
}
