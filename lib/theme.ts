export const cosmicTokens = {
  void: '#F8FAFC',
  deep: '#FFFFFF',
  starlight: '#0284C7',
  pulsar: '#9333EA',
  solar: '#D97706',
  supernova: '#E11D48',
  aurora: '#059669',
  primaryText: '#0F172A',
  secondaryText: '#475569',
  mutedText: '#94A3B8',
  orbit: '#E2E8F0',
} as const

export const statusColors: Record<string, string> = {
  draft: '#64748B',
  pending_approval: '#FBBF24',
  scheduled: '#A855F7',
  queued: '#22D3EE',
  sending: '#22D3EE',
  sent: '#34D399',
  partially_failed: '#FBBF24',
  no_recipient: '#64748B',
  stopped: '#F97316',
  cancelled: '#64748B',
  failed: '#FB7185',
  active: '#34D399',
  suspended: '#FBBF24',
  revoked: '#FB7185',
  published: '#34D399',
  superseded: '#A855F7',
  archived: '#64748B',
  // UC-007 BR-9 / 04 §B2: unsubscribed rose (người đã nói không), invalid amber (mailbox chết)
  unsubscribed: '#FB7185',
  invalid: '#FBBF24',
  included: '#34D399',
  excluded: '#64748B',
  broken: '#FB7185',
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
