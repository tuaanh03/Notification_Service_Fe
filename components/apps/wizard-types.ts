import type { Channel } from '@/lib/mock-data'

export type TopicDraft = {
  suffix: string
  name: string
  description: string
  channels: Channel[]
  severity: 'info' | 'warning' | 'critical'
  userMutable: boolean
}

export type ProfileDraft = {
  /** '' = chưa chọn; 'external' = App chưa có trong EWS (A1) */
  appSlug: string
  external: boolean
  namespace: string
  channels: Channel[]
  /** repeatable domain / CIDR (UC-001 §B) — external bắt buộc ≥ 1 CIDR */
  origins: string[]
  ipAllowlist: string[]
}

/** UC-001 BR-2 regex namespace — hiện nguyên văn trong lỗi */
export const NAMESPACE_RE = /^[a-z][a-z0-9_]{2,}$/
export const NAMESPACE_RE_TEXT = '^[a-z][a-z0-9_]{2,}$'
/** allowed_origins phải là origin https đầy đủ; ip_allowlist là CIDR IPv4 */
export const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i
export const CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
export const validateOrigin = (v: string) => (ORIGIN_RE.test(v) ? null : 'Phải là origin, ví dụ https://service.enterprise.vn')
export const validateCidr = (v: string) => (CIDR_RE.test(v) ? null : 'Phải là CIDR IPv4, ví dụ 10.20.0.0/16')
/** Hồ sơ hợp lệ để qua bước 2 (UC-001 BR-2 + ip_allowlist bắt buộc với app ngoài mạng) */
export const profileValid = (p: ProfileDraft) =>
  NAMESPACE_RE.test(p.namespace) &&
  p.namespace !== 'system' &&
  p.channels.length > 0 &&
  (!p.external || p.ipAllowlist.length > 0)
