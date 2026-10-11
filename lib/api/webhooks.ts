import 'server-only'
import { adminFetch } from './client'
import type {
  IssuedWebhookSecretDto,
  WebhookDeliveryDto,
  WebhookEndpointDto,
  WebhookEventType,
  WebhookListDto,
} from './types'

/**
 * Outgoing webhook của một app (ADR-0029 của backend) — `/admin/apps/:appId/webhooks/*`.
 * Secret (`whsec_…`) chỉ đi qua `createWebhook` / `rotateWebhookSecret`, không ghi log, không lưu lại.
 */

const base = (appId: string) => `/apps/${encodeURIComponent(appId)}/webhooks`
const one = (appId: string, endpointId: string) => `${base(appId)}/${encodeURIComponent(endpointId)}`

export async function listWebhooks(appId: string): Promise<WebhookListDto> {
  return adminFetch<WebhookListDto>(base(appId))
}

export async function createWebhook(
  appId: string,
  input: { url: string; events: WebhookEventType[] },
): Promise<IssuedWebhookSecretDto> {
  return adminFetch<IssuedWebhookSecretDto>(base(appId), { method: 'POST', body: input })
}

export async function updateWebhook(
  appId: string,
  endpointId: string,
  input: { events?: WebhookEventType[]; status?: 'active' | 'disabled' },
): Promise<WebhookEndpointDto> {
  return adminFetch<WebhookEndpointDto>(one(appId, endpointId), { method: 'PATCH', body: input })
}

/** Secret cũ hết hiệu lực NGAY ở lần gọi kế tiếp. */
export async function rotateWebhookSecret(appId: string, endpointId: string): Promise<IssuedWebhookSecretDto> {
  return adminFetch<IssuedWebhookSecretDto>(`${one(appId, endpointId)}/rotate-secret`, { method: 'POST' })
}

/** Xoá URL cùng nhật ký gọi của nó. */
export async function deleteWebhook(appId: string, endpointId: string): Promise<void> {
  await adminFetch<void>(one(appId, endpointId), { method: 'DELETE' })
}

/**
 * Gọi NGAY một sự kiện `ping` và chờ kết quả. Backend chờ app tối đa 10 giây, nên nới timeout của
 * lời gọi này lên 20 giây — mặc định 10 giây của client sẽ cắt trước khi backend kịp trả lời.
 */
export async function testWebhook(appId: string, endpointId: string): Promise<WebhookDeliveryDto> {
  return adminFetch<WebhookDeliveryDto>(`${one(appId, endpointId)}/test`, { method: 'POST', timeoutMs: 20_000 })
}

/** 50 lần gọi gần nhất, mới nhất trước. */
export async function listWebhookDeliveries(appId: string, endpointId: string): Promise<WebhookDeliveryDto[]> {
  return adminFetch<WebhookDeliveryDto[]>(`${one(appId, endpointId)}/deliveries`)
}
