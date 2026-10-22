export const cosmicTokens = {
  void: '#F8FAFC',
  deep: '#FFFFFF',
  starlight: '#0369A1',
  pulsar: '#9333EA',
  solar: '#B45309',
  supernova: '#BE123C',
  aurora: '#047857',
  primaryText: '#0F172A',
  secondaryText: '#475569',
  mutedText: '#5F6E83',
  orbit: '#E2E8F0',
} as const

export const statusColors: Record<string, string> = {
  draft: '#475569',
  pending_approval: '#A85008',
  scheduled: '#7E22CE',
  queued: '#0E7490',
  sending: '#0E7490',
  sent: '#047857',
  partially_failed: '#A85008',
  no_recipient: '#475569',
  stopped: '#B23C0B',
  cancelled: '#475569',
  failed: '#BE123C',
  active: '#047857',
  suspended: '#A85008',
  revoked: '#BE123C',
  published: '#047857',
  superseded: '#7E22CE',
  archived: '#475569',
  // UC-007 BR-9 / 04 §B2: unsubscribed rose (người đã nói không), invalid amber (mailbox chết)
  unsubscribed: '#BE123C',
  invalid: '#A85008',
  included: '#047857',
  excluded: '#475569',
  broken: '#BE123C',
  // Outgoing webhook (ADR-0029): URL tắt · lượt gọi đã giao / còn chờ gọi (lại)
  disabled: '#475569',
  delivered: '#047857',
  pending: '#0E7490',
  // Incoming webhook (ADR-0030): kết cục một lần gọi vào (`published` dùng màu ở trên)
  duplicate: '#7E22CE',
  skipped: '#475569',
  rejected: '#BE123C',
}

export const notificationStatuses = [
  'draft',
  'pending_approval',
  'scheduled',
  'queued',
  'sending',
  'sent',
  'partially_failed',
  'no_recipient',
  'stopped',
  'cancelled',
  'failed',
] as const
export type Status = keyof typeof statusColors
export type NotificationStatus = (typeof notificationStatuses)[number]

/**
 * Tiêu đề cột dùng chung cho mọi bảng: chữ thường, đậm vừa, nền xám nhạt. Không VIẾT HOA giãn chữ —
 * tiếng Việt có dấu viết hoa cỡ nhỏ rất khó đọc ("KẾT CỤC", "ĐANG XUẤT BẢN").
 */
export const TABLE_HEADER_CLASS = 'bg-muted text-xs font-semibold text-[var(--text-secondary)]'
