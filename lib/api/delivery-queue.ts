import 'server-only'
import { adminFetch } from './client'
import type { DeliveryQueueDto } from './types'

/** Hàng chờ gửi của cả hệ thống (ADR-0041 của backend) — chỉ Super Admin. */
export async function getDeliveryQueue(): Promise<DeliveryQueueDto> {
  return adminFetch<DeliveryQueueDto>('/delivery-queue')
}
