import 'server-only'
import { type AuditEntry } from '@/lib/mock-data'
import { fmtDateTime } from '@/lib/time'
import { adminFetch } from './client'
import type { AuditEntryDto } from './types'

export type { AuditEntryDto }

/**
 * GET /admin/audit?targetType=&targetId= — nguồn duy nhất cho `<AuditTrail>`.
 *
 * Audit được ghi bất đồng bộ (domain event -> stream `audit.events` -> bảng `audit_log`),
 * nên một thao tác vừa xong có thể chưa xuất hiện ngay ở lần đọc kế tiếp.
 */
export async function listAudit(
  targetType: string,
  targetId: string,
  limit?: number,
): Promise<AuditEntryDto[]> {
  return adminFetch<AuditEntryDto[]>('/audit', {
    query: {
      targetType,
      targetId,
      ...(limit === undefined ? {} : { limit: String(limit) }),
    },
  })
}

/** Event của app liên quan tới khoá API — dùng lọc riêng cho màn Credentials (UC-001 §E). */
export const SECRET_AUDIT_ACTIONS = ['AppSecretIssued', 'AppSecretRevoked'] as const

/** Event thêm / gỡ allowlist IP & Origin — cho màn `/settings/origins`. */
export const NETWORK_RULE_AUDIT_ACTIONS = ['AppNetworkRuleAdded', 'AppNetworkRuleRemoved'] as const

/** Tên event của backend -> câu người trực đọc được. Chưa có bản dịch thì giữ nguyên tên event. */
const ACTION_LABELS: Readonly<Record<string, string>> = {
  AppCreated: 'tạo app',
  AppSubmittedForReview: 'gửi app đi duyệt',
  AppApproved: 'duyệt app',
  AppRejected: 'từ chối app',
  AppSuspended: 'tạm ngưng app',
  AppResumed: 'mở lại app',
  AppRevoked: 'thu hồi app',
  AppSecretIssued: 'cấp khoá API',
  AppSecretRevoked: 'thu hồi khoá API',
  AppNetworkRuleAdded: 'thêm nguồn gọi',
  AppNetworkRuleRemoved: 'gỡ nguồn gọi',
}

/** Lấy phần đáng hiện của `before`/`after`: hint của khoá, `kind value` của nguồn gọi, hoặc trạng thái. */
function summarize(payload: Record<string, unknown> | null): string | undefined {
  if (!payload) return undefined
  if (typeof payload.kind === 'string' && typeof payload.value === 'string') return `${payload.kind} ${payload.value}`
  const value = payload.hint ?? payload.status
  return typeof value === 'string' ? value : undefined
}

/** `AuditEntryDto` -> `AuditEntry` mà `<AuditTrail>` đang đọc. */
export function toAuditEntry(dto: AuditEntryDto): AuditEntry {
  return {
    actor: dto.actor,
    action: ACTION_LABELS[dto.action] ?? dto.action,
    ...(summarize(dto.before) === undefined ? {} : { from: summarize(dto.before) }),
    ...(summarize(dto.after) === undefined ? {} : { to: summarize(dto.after) }),
    timestamp: fmtDateTime(dto.at),
    source: dto.source,
  }
}
