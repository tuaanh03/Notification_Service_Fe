import 'server-only'
import { adminFetch } from './client'
import type {
  HookPreviewDto,
  IncomingCallDto,
  IncomingHookConfigInput,
  IncomingHookDto,
  IncomingHookListDto,
  IssuedHookUrlDto,
} from './types'

/**
 * Incoming webhook của một app (ADR-0030 của backend) — `/admin/apps/:appId/incoming-webhooks/*`.
 * Token `ewshk_…` chỉ đi qua `createIncomingHook` / `rotateIncomingHookToken`, không ghi log, không lưu lại.
 */

const base = (appId: string) => `/apps/${encodeURIComponent(appId)}/incoming-webhooks`
const one = (appId: string, hookId: string) => `${base(appId)}/${encodeURIComponent(hookId)}`

export async function listIncomingHooks(appId: string): Promise<IncomingHookListDto> {
  return adminFetch<IncomingHookListDto>(base(appId))
}

export async function createIncomingHook(appId: string, config: IncomingHookConfigInput): Promise<IssuedHookUrlDto> {
  return adminFetch<IssuedHookUrlDto>(base(appId), { method: 'POST', body: config })
}

export async function updateIncomingHook(
  appId: string,
  hookId: string,
  input: { config?: IncomingHookConfigInput; status?: 'active' | 'disabled' },
): Promise<IncomingHookDto> {
  return adminFetch<IncomingHookDto>(one(appId, hookId), { method: 'PATCH', body: input })
}

/** URL đầy đủ, lấy bất cứ lúc nào (người quản lý app) — backend ghi audit mỗi lần lấy. */
export async function revealIncomingHookUrl(appId: string, hookId: string): Promise<{ path: string; url: string | null }> {
  return adminFetch<{ path: string; url: string | null }>(`${one(appId, hookId)}/url`)
}

/** URL cũ chết NGAY. */
export async function rotateIncomingHookToken(appId: string, hookId: string): Promise<IssuedHookUrlDto> {
  return adminFetch<IssuedHookUrlDto>(`${one(appId, hookId)}/rotate-token`, { method: 'POST' })
}

export async function deleteIncomingHook(appId: string, hookId: string): Promise<void> {
  await adminFetch<void>(one(appId, hookId), { method: 'DELETE' })
}

/** Không ghi, không gửi — chạy cấu hình (chưa cần lưu) trên JSON mẫu. */
export async function previewIncomingHook(
  appId: string,
  input: { config: Omit<IncomingHookConfigInput, 'name'> & { name?: string }; sample: unknown; idempotencyKey?: string },
): Promise<HookPreviewDto> {
  return adminFetch<HookPreviewDto>(`${base(appId)}/preview`, { method: 'POST', body: input })
}

/** 50 lần gọi gần nhất, mới nhất trước. */
export async function listIncomingCalls(appId: string, hookId: string): Promise<IncomingCallDto[]> {
  return adminFetch<IncomingCallDto[]>(`${one(appId, hookId)}/calls`)
}
