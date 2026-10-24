/**
 * Đọc spec OpenAPI 3.1 của backend (ADR-0042) cho trang `/developers`. Hàm thuần, không `server-only` — component
 * client gọi để nhóm, tìm, dựng bảng field / JSON mẫu / lệnh curl. Spec sinh từ chính schema zod của route, nên trang
 * này KHÔNG giữ hợp đồng nào của riêng nó: thứ gì không có trong spec thì không hiện.
 */

/**
 * Domain API công khai — `/admin` chỉ mở cho request mang PAT (ADR-0041 §10), `/v1` cho khoá app. Chỉ là dự phòng:
 * spec có `servers` (từ cài đặt `api.public_base_url`) thì dùng cái đó (`apiBaseOf`).
 */
export const PUBLIC_API_BASE = 'https://api-ews-astrolink.eonsr.net'

export type JsonSchema = {
  $ref?: string
  type?: string | string[]
  format?: string
  description?: string
  title?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  additionalProperties?: boolean | JsonSchema
  enum?: unknown[]
  const?: unknown
  default?: unknown
  example?: unknown
  examples?: unknown[]
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  nullable?: boolean
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  pattern?: string
}

export type OpenApiParameter = {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  description?: string
  schema?: JsonSchema
}

/** `example` chỉ có ở một số route backend khai tay; không có thì tự sinh từ schema (`sampleOf`). */
export type MediaType = { schema?: JsonSchema; example?: unknown }

export type OpenApiResponse = {
  description?: string
  content?: Record<string, MediaType>
  [extension: `x-${string}`]: unknown
}

export type OpenApiOperation = {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  deprecated?: boolean
  parameters?: Array<OpenApiParameter | { $ref: string }>
  requestBody?: { required?: boolean; description?: string; content?: Record<string, MediaType> }
  responses?: Record<string, OpenApiResponse | { $ref: string }>
  security?: Record<string, string[]>[]
  'x-ews-permission'?: string
  'x-ews-pat-scope'?: 'read' | 'write'
  'x-ews-dto'?: string
  /** Mã lỗi ổn định route có thể trả (gồm mã trong `issues` của 422). */
  'x-ews-errors'?: { status: number; code: string }[]
  /** Chỉ nhận phiên đăng nhập console — PAT gọi bị 403 `SESSION_REQUIRED` (quản lý PAT, ADR-0041 §6). */
  'x-ews-session-only'?: boolean
  [extension: `x-${string}`]: unknown
}

export type OpenApiDoc = {
  openapi: string
  info: { title: string; version: string; description?: string }
  servers?: { url: string }[]
  /** Thứ tự nên hiển thị. `x-ews-surface`: bề mặt của nhóm. */
  tags?: { name: string; description?: string; 'x-ews-surface'?: 'admin' | 'v1' | 'hooks' }[]
  paths: Record<string, Partial<Record<string, OpenApiOperation>>>
  components?: {
    schemas?: Record<string, JsonSchema>
    parameters?: Record<string, OpenApiParameter>
    responses?: Record<string, OpenApiResponse>
  }
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head'] as const
export type HttpMethod = (typeof METHODS)[number]

/** Bề mặt của một route — quyết định header xác thực trong lệnh curl. */
export type AuthKind = 'pat' | 'appKey' | 'none'

export type Operation = {
  /** `get /admin/apps/{appId}` — khoá ổn định cho React + neo `#`. */
  id: string
  method: HttpMethod
  path: string
  tag: string
  op: OpenApiOperation
  auth: AuthKind
}

export type OperationGroup = { tag: string; description: string | null; surface: 'admin' | 'v1' | 'hooks' | null; operations: Operation[] }

/** Gốc URL cho lệnh curl: `servers[0].url` của spec, không có thì domain API công khai. */
export function apiBaseOf(doc: OpenApiDoc): string {
  return (doc.servers?.[0]?.url ?? PUBLIC_API_BASE).replace(/\/+$/, '')
}

const OTHER_TAG = 'other'

/** Đoạn có nghĩa đầu tiên sau bề mặt: `/admin/apps/{appId}/topics` -> `topics`; `/v1/notifications` -> `notifications`. */
function tagFromPath(path: string): string {
  const parts = path.split('/').filter((p) => p && !p.startsWith('{'))
  return parts[parts.length - 1] ?? OTHER_TAG
}

export function authOf(path: string, op: OpenApiOperation): AuthKind {
  if (op.security) {
    if (op.security.length === 0) return 'none'
    const names = op.security.flatMap((s) => Object.keys(s))
    if (names.includes('pat')) return 'pat'
    if (names.includes('appKey')) return 'appKey'
    if (names.length === 0) return 'none'
  }
  if (path.startsWith('/v1')) return 'appKey'
  if (path.startsWith('/hooks')) return 'none'
  return 'pat'
}

/** Mọi operation, nhóm theo `tags[0]` — thứ tự nhóm theo `tags` cấp tài liệu (nếu có), rồi theo chữ. */
export function groupOperations(doc: OpenApiDoc): OperationGroup[] {
  const ops: Operation[] = []
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS) {
      const op = item?.[method]
      if (!op) continue
      ops.push({ id: `${method} ${path}`, method, path, tag: op.tags?.[0] ?? tagFromPath(path), op, auth: authOf(path, op) })
    }
  }
  const declared = (doc.tags ?? []).map((t) => t.name)
  const names = [...new Set(ops.map((o) => o.tag))].sort((a, b) => {
    const ia = declared.indexOf(a)
    const ib = declared.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
    return a.localeCompare(b)
  })
  return names.map((tag) => {
    const declaredTag = doc.tags?.find((t) => t.name === tag)
    return {
      tag,
      description: declaredTag?.description ?? null,
      surface: declaredTag?.['x-ews-surface'] ?? null,
      operations: ops.filter((o) => o.tag === tag),
    }
  })
}

/** Khớp ô tìm: path, method, tóm tắt, quyền, operationId — không phân biệt hoa thường. */
export function matchesQuery(o: Operation, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [o.method, o.path, o.tag, o.op.summary, o.op.description, o.op.operationId, o.op['x-ews-permission']]
    .filter((x): x is string => typeof x === 'string')
    .some((x) => x.toLowerCase().includes(q))
}

/** Theo `$ref` nội bộ (`#/components/...`). Ref lạ / vòng lặp -> trả nguyên. */
export function deref<T extends object>(doc: OpenApiDoc, value: T | { $ref: string }, seen = new Set<string>()): T {
  let current: unknown = value
  while (current && typeof current === 'object' && '$ref' in current && typeof current.$ref === 'string') {
    const ref = current.$ref
    if (seen.has(ref) || !ref.startsWith('#/')) break
    seen.add(ref)
    let next: unknown = doc
    for (const part of ref.slice(2).split('/')) {
      next = next && typeof next === 'object' ? (next as Record<string, unknown>)[part.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined
    }
    if (next === undefined) break
    current = next
  }
  return current as T
}

export function parametersOf(doc: OpenApiDoc, op: OpenApiOperation): OpenApiParameter[] {
  return (op.parameters ?? []).map((p) => deref<OpenApiParameter>(doc, p))
}

function mediaOf(content: Record<string, MediaType> | undefined): MediaType | null {
  if (!content) return null
  return content['application/json'] ?? content['application/problem+json'] ?? Object.values(content)[0] ?? null
}

export function jsonSchemaOf(content: Record<string, MediaType> | undefined): JsonSchema | null {
  return mediaOf(content)?.schema ?? null
}

/** JSON mẫu của body: `example` backend khai tay, không có thì tự sinh từ schema. `undefined` = route không có body. */
export function bodySampleOf(doc: OpenApiDoc, op: OpenApiOperation): unknown {
  const media = mediaOf(op.requestBody?.content)
  if (!media) return undefined
  if (media.example !== undefined) return media.example
  return media.schema ? sampleOf(doc, media.schema) : undefined
}

/** Bỏ nhánh `null` của `anyOf` / `oneOf` — `T | null` hiện là `T` + cờ "có thể null". */
function unwrapNullable(doc: OpenApiDoc, raw: JsonSchema): { schema: JsonSchema; nullable: boolean } {
  const schema = deref<JsonSchema>(doc, raw)
  const alts = schema.anyOf ?? schema.oneOf
  if (alts) {
    const rest = alts.filter((a) => deref<JsonSchema>(doc, a).type !== 'null')
    if (rest.length === 1 && rest.length < alts.length) {
      const inner = unwrapNullable(doc, rest[0]!)
      return { schema: { ...inner.schema, description: schema.description ?? inner.schema.description }, nullable: true }
    }
  }
  if (Array.isArray(schema.type) && schema.type.includes('null')) {
    const types = schema.type.filter((t) => t !== 'null')
    return { schema: { ...schema, type: types.length === 1 ? types[0] : types }, nullable: true }
  }
  return { schema, nullable: schema.nullable === true }
}

/** Nhãn kiểu ngắn: `string`, `integer`, `string (uuid)`, `array<object>`, `"read" | "write"`. */
export function typeLabel(doc: OpenApiDoc, raw: JsonSchema): string {
  const { schema, nullable } = unwrapNullable(doc, raw)
  let label: string
  if (schema.const !== undefined) label = JSON.stringify(schema.const)
  else if (schema.enum) label = schema.enum.map((v) => JSON.stringify(v)).join(' | ')
  else if (schema.anyOf || schema.oneOf) label = (schema.anyOf ?? schema.oneOf)!.map((s) => branchLabel(doc, s)).join(' | ')
  else if (schema.type === 'array') label = `array<${schema.items ? typeLabel(doc, schema.items) : 'any'}>`
  else if (Array.isArray(schema.type)) label = schema.type.join(' | ')
  else label = schema.type ?? (schema.properties ? 'object' : 'any')
  if (schema.format) label += ` (${schema.format})`
  return nullable ? `${label} | null` : label
}

/** Một nhánh của union: object có `title` (backend đặt, vd. `PathMapping`) hiện bằng tên đó — `object | object` không nói gì. */
function branchLabel(doc: OpenApiDoc, raw: JsonSchema): string {
  const schema = deref<JsonSchema>(doc, raw)
  const isObject = schema.type === 'object' || (schema.type === undefined && schema.properties !== undefined)
  return isObject && schema.title ? schema.title : typeLabel(doc, raw)
}

/** Ràng buộc đọc được: `1–100 ký tự`… trả dạng token để màn tự dịch. */
export type Constraint = { kind: 'length' | 'range' | 'items' | 'pattern' | 'default'; value: string }

export function constraintsOf(doc: OpenApiDoc, raw: JsonSchema): Constraint[] {
  const { schema } = unwrapNullable(doc, raw)
  const out: Constraint[] = []
  const span = (min?: number, max?: number) =>
    min !== undefined && max !== undefined ? `${min}–${max}` : min !== undefined ? `≥ ${min}` : max !== undefined ? `≤ ${max}` : null
  const length = span(schema.minLength, schema.maxLength)
  if (length) out.push({ kind: 'length', value: length })
  const range = span(schema.minimum ?? schema.exclusiveMinimum, schema.maximum ?? schema.exclusiveMaximum)
  if (range) out.push({ kind: 'range', value: range })
  const items = span(schema.minItems, schema.maxItems)
  if (items) out.push({ kind: 'items', value: items })
  if (schema.pattern) out.push({ kind: 'pattern', value: schema.pattern })
  if (schema.default !== undefined) out.push({ kind: 'default', value: JSON.stringify(schema.default) })
  return out
}

export type FieldRow = { path: string; type: string; required: boolean; description: string | null; constraints: Constraint[]; depth: number }

const MAX_DEPTH = 5

/** Mọi trường của một object, trải phẳng `a.b`, `items[].c` — bảng field của body / response. */
export function fieldRows(doc: OpenApiDoc, raw: JsonSchema | null, prefix = '', depth = 0, required = true): FieldRow[] {
  if (!raw || depth > MAX_DEPTH) return []
  const { schema } = unwrapNullable(doc, raw)
  if (schema.allOf) return schema.allOf.flatMap((s) => fieldRows(doc, s, prefix, depth, required))
  if (schema.type === 'array' && schema.items) {
    const items = unwrapNullable(doc, schema.items).schema
    return items.properties || items.allOf ? fieldRows(doc, items, `${prefix}[]`, depth, required) : []
  }
  const alts = schema.anyOf ?? schema.oneOf
  if (alts && !schema.properties) {
    // Union của object (vd nội dung viết thẳng | template): gộp field của mọi nhánh, field chỉ có ở một nhánh -> không bắt buộc.
    const branches = alts.map((a) => fieldRows(doc, a, prefix, depth, required))
    const seen = new Map<string, FieldRow>()
    for (const rows of branches) {
      for (const row of rows) {
        const inAll = branches.every((b) => b.some((r) => r.path === row.path))
        if (!seen.has(row.path)) seen.set(row.path, { ...row, required: row.required && inAll })
      }
    }
    return [...seen.values()]
  }
  if (!schema.properties) return []
  const req = new Set(schema.required ?? [])
  return Object.entries(schema.properties).flatMap(([name, child]) => {
    const path = prefix ? `${prefix}.${name}` : name
    const own = unwrapNullable(doc, child).schema
    const row: FieldRow = {
      path,
      type: typeLabel(doc, child),
      required: required && req.has(name),
      description: own.description ?? null,
      constraints: constraintsOf(doc, child),
      depth,
    }
    return [row, ...fieldRows(doc, child, path, depth + 1, required && req.has(name))]
  })
}

const SAMPLE_BY_FORMAT: Record<string, string> = {
  'date-time': '2026-10-23T08:00:00.000Z',
  date: '2026-10-23',
  email: 'ban@company.com',
  uuid: '7f3c2a9e-1b4d-4e8a-9c21-5d6e7f8a9b0c',
  uri: 'https://example.com',
  url: 'https://example.com',
  ipv4: '203.0.113.10',
}

/** JSON mẫu dựng từ schema: `example` > `examples[0]` > `default` > `const` > `enum[0]` > giá trị theo kiểu. */
export function sampleOf(doc: OpenApiDoc, raw: JsonSchema | null, depth = 0, name = ''): unknown {
  if (!raw || depth > MAX_DEPTH) return null
  const schema = deref<JsonSchema>(doc, raw)
  if (schema.example !== undefined) return schema.example
  if (schema.examples?.length) return schema.examples[0]
  if (schema.default !== undefined) return schema.default
  if (schema.const !== undefined) return schema.const
  if (schema.enum?.length) return schema.enum[0]
  if (schema.allOf) {
    return Object.assign({}, ...schema.allOf.map((s) => sampleOf(doc, s, depth, name)).filter((x) => x && typeof x === 'object'))
  }
  const alts = schema.anyOf ?? schema.oneOf
  if (alts) {
    const first = alts.find((a) => deref<JsonSchema>(doc, a).type !== 'null') ?? alts[0]
    return first ? sampleOf(doc, first, depth, name) : null
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type
  switch (type) {
    case 'string':
      return (schema.format && SAMPLE_BY_FORMAT[schema.format]) ?? (name ? sampleString(name, schema) : 'string')
    case 'integer':
    case 'number':
      return schema.minimum ?? schema.exclusiveMinimum ?? 1
    case 'boolean':
      return true
    case 'null':
      return null
    case 'array':
      return schema.items ? [sampleOf(doc, schema.items, depth + 1, name)] : []
    default: {
      if (!schema.properties) return type === 'object' ? {} : null
      return Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, sampleOf(doc, v, depth + 1, k)]))
    }
  }
}

/** Chuỗi mẫu theo tên trường — đủ để người đọc hiểu, không giả làm dữ liệu thật. */
function sampleString(name: string, schema: JsonSchema): string {
  const base = name.toLowerCase().endsWith('id') ? `${name}` : name
  const value = `<${base}>`
  return schema.maxLength !== undefined && value.length > schema.maxLength ? value.slice(0, schema.maxLength) : value
}

const AUTH_HEADER: Record<AuthKind, string | null> = {
  pat: 'Authorization: Bearer ewspat_…',
  appKey: 'Authorization: Bearer ews_…',
  none: null,
}

/** `'` trong body phải thoát khỏi chuỗi nháy đơn của shell. */
const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`

/** Lệnh curl chép được: tham số đường dẫn giữ `{appId}`, query bắt buộc có giá trị mẫu, body là JSON mẫu. */
export function curlOf(doc: OpenApiDoc, o: Operation, base = apiBaseOf(doc)): string {
  const query = parametersOf(doc, o.op)
    .filter((p) => p.in === 'query' && p.required)
    .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(String(sampleOf(doc, p.schema ?? null, 0, p.name) ?? ''))}`)
  const url = `${base}${o.path}${query.length ? `?${query.join('&')}` : ''}`
  const lines = [`curl -X ${o.method.toUpperCase()} ${shellQuote(url)}`]
  const auth = AUTH_HEADER[o.auth]
  if (auth) lines.push(`-H ${shellQuote(auth)}`)
  const body = bodySampleOf(doc, o.op)
  if (body !== undefined) {
    lines.push(`-H 'Content-Type: application/json'`)
    lines.push(`-d ${shellQuote(JSON.stringify(body, null, 2))}`)
  }
  return lines.join(' \\\n  ')
}

/** Response của một operation, theo mã tăng dần; `$ref` đã theo. */
export function responsesOf(doc: OpenApiDoc, op: OpenApiOperation): { status: string; response: OpenApiResponse }[] {
  return Object.entries(op.responses ?? {})
    .map(([status, r]) => ({ status, response: deref<OpenApiResponse>(doc, r) }))
    .sort((a, b) => a.status.localeCompare(b.status))
}

/** Mã lỗi ổn định của route (`x-ews-errors`), theo HTTP status rồi theo mã; bỏ trùng. */
export function errorsOf(op: OpenApiOperation): { status: number; code: string }[] {
  const seen = new Set<string>()
  return (op['x-ews-errors'] ?? [])
    .filter((e) => {
      const key = `${e.status}:${e.code}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.status - b.status || a.code.localeCompare(b.code))
}
