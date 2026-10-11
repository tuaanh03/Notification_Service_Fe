'use server'

import { toResult, type ActionResult } from '@/lib/api/result'
import type {
  IssuedWebhookSecretDto,
  WebhookDeliveryDto,
  WebhookEndpointDto,
  WebhookEventType,
  WebhookListDto,
} from '@/lib/api/types'
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  rotateWebhookSecret,
  testWebhook,
  updateWebhook,
} from '@/lib/api/webhooks'

/**
 * BFF của màn Webhooks (ADR-0029 của backend). Như `/settings/credentials`: app đang chọn nằm ở
 * `?app=` phía client nên dùng Server Action, token phiên không rời phía server (CLAUDE.md mục 2.2).
 *
 * Secret `whsec_…` chỉ đi qua đúng response của `createWebhookAction` / `rotateWebhookSecretAction`
 * — không ghi log, không lưu lại.
 */

export async function loadWebhooksAction(appId: string): Promise<ActionResult<WebhookListDto>> {
  return toResult(() => listWebhooks(appId))
}

export async function createWebhookAction(
  appId: string,
  input: { url: string; events: WebhookEventType[] },
): Promise<ActionResult<IssuedWebhookSecretDto>> {
  return toResult(() => createWebhook(appId, input))
}

export async function updateWebhookAction(
  appId: string,
  endpointId: string,
  input: { events?: WebhookEventType[]; status?: 'active' | 'disabled' },
): Promise<ActionResult<WebhookEndpointDto>> {
  return toResult(() => updateWebhook(appId, endpointId, input))
}

export async function rotateWebhookSecretAction(
  appId: string,
  endpointId: string,
): Promise<ActionResult<IssuedWebhookSecretDto>> {
  return toResult(() => rotateWebhookSecret(appId, endpointId))
}

export async function deleteWebhookAction(appId: string, endpointId: string): Promise<ActionResult<null>> {
  return toResult(async () => {
    await deleteWebhook(appId, endpointId)
    return null
  })
}

export async function testWebhookAction(appId: string, endpointId: string): Promise<ActionResult<WebhookDeliveryDto>> {
  return toResult(() => testWebhook(appId, endpointId))
}

export async function loadWebhookDeliveriesAction(
  appId: string,
  endpointId: string,
): Promise<ActionResult<WebhookDeliveryDto[]>> {
  return toResult(() => listWebhookDeliveries(appId, endpointId))
}
