import 'server-only'
import { type AuditEntry } from '@/lib/mock-data'
import { fmtDateTime } from '@/lib/time'
import { adminFetch } from './client'
import type { AuditEntryDto, AuditEventPageDto } from './types'

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

/** Bộ lọc nhật ký chung. Bỏ trống = không lọc. */
export interface AuditSearchInput {
  actions?: readonly string[]
  /** ISO — đầu khoảng thời gian. */
  from?: string
  cursor?: string
  limit?: number
}

/** GET /admin/audit/events — nhật ký chung, chỉ Super Admin (mới nhất trước, phân trang bằng con trỏ). */
export async function searchAudit(input: AuditSearchInput): Promise<AuditEventPageDto> {
  return adminFetch<AuditEventPageDto>('/audit/events', {
    query: {
      action: input.actions && input.actions.length > 0 ? input.actions.join(',') : undefined,
      from: input.from,
      cursor: input.cursor,
      limit: input.limit === undefined ? undefined : String(input.limit),
    },
  })
}

/** Event của app liên quan tới khoá API — dùng lọc riêng cho màn Credentials (UC-001 §E). */
export const SECRET_AUDIT_ACTIONS = ['AppSecretIssued', 'AppSecretRevoked'] as const

/** Event thêm / gỡ giới hạn IP — cho màn `/admin/apps/<appId>/network`. */
export const NETWORK_RULE_AUDIT_ACTIONS = ['AppNetworkRuleAdded', 'AppNetworkRuleRemoved'] as const

/** Lấy phần đáng hiện của `before`/`after`: hint của khoá, `kind value` của nguồn gọi, bắt buộc hay không, hoặc trạng thái. */
function summarize(payload: Record<string, unknown> | null): string | undefined {
  if (!payload) return undefined
  if (typeof payload.kind === 'string' && typeof payload.value === 'string') return `${payload.kind} ${payload.value}`
  // Đặt / bỏ chủ đề bắt buộc (`TopicMandatoryChanged`) -> nhãn `mandatory` / `optional` (nhóm `status`).
  if (typeof payload.mandatory === 'boolean') return payload.mandatory ? 'mandatory' : 'optional'
  const value = payload.hint ?? payload.status
  return typeof value === 'string' ? value : undefined
}

/** `AuditEntryDto` -> `AuditEntry` mà `<AuditTrail>` đang đọc. */
export function toAuditEntry(dto: AuditEntryDto): AuditEntry {
  return {
    actor: dto.actor,
    actorType: dto.actorType,
    // Giữ TÊN EVENT — `<AuditTrail>` dịch theo ngôn ngữ đang chọn (`messages/*.json` nhóm `auditActions`).
    action: dto.action,
    ...(summarize(dto.before) === undefined ? {} : { from: summarize(dto.before) }),
    ...(summarize(dto.after) === undefined ? {} : { to: summarize(dto.after) }),
    timestamp: fmtDateTime(dto.at),
    source: dto.source,
  }
}
