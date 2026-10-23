/** Tab của `/admin/queue` (`?tab=`) — dùng ở cả page (server) lẫn màn (client), nên không nằm trong file `'use client'`. */
export const QUEUE_TABS = ['overview', 'streams', 'errors'] as const
export type QueueTab = (typeof QUEUE_TABS)[number]
export const queueTabOf = (raw: string | undefined | null): QueueTab => QUEUE_TABS.find((x) => x === raw) ?? 'overview'
