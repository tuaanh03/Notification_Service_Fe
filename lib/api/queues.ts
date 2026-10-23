import 'server-only'
import { adminFetch } from './client'
import type { DeadLetterDto, QueuesDto } from './types'

/** Hàng đợi (Redis Streams) — chỉ Super Admin (ADR-0042 của backend). */
export async function getQueues(): Promise<QueuesDto> {
  return adminFetch<QueuesDto>('/queues')
}

export async function listDeadLetters(limit = 100): Promise<DeadLetterDto[]> {
  return (await adminFetch<{ items: DeadLetterDto[] }>(`/queues/dead-letters?limit=${limit}`)).items
}

const letterPath = (stream: string, id: string) => `/queues/dead-letters/${encodeURIComponent(stream)}/${encodeURIComponent(id)}`

/** Đưa message lỗi về hàng đợi gốc để xử lý lại. */
export async function requeueDeadLetter(stream: string, id: string): Promise<{ id: string }> {
  return adminFetch<{ id: string }>(`${letterPath(stream, id)}/requeue`, { method: 'POST' })
}

/** Xoá hẳn message lỗi — lý do bắt buộc. */
export async function discardDeadLetter(stream: string, id: string, reason: string): Promise<void> {
  await adminFetch<void>(`${letterPath(stream, id)}/discard`, { method: 'POST', body: { reason } })
}

/** Tạm dừng / chạy lại một nhóm xử lý (mọi bản worker, có hiệu lực sau vài giây). */
export async function setGroupPaused(group: string, paused: boolean): Promise<{ paused: boolean }> {
  return adminFetch<{ paused: boolean }>(`/queues/groups/${encodeURIComponent(group)}/pause`, { method: 'PUT', body: { paused } })
}
