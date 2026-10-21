/**
 * Nhóm sự kiện của màn Nhật ký hoạt động (`/admin/audit`). Tên sự kiện sao đúng backend (`eventType` trong
 * `src/modules/*\/application/events.ts` + tenancy). Sự kiện mới chưa xếp nhóm vẫn hiện ở "Tất cả".
 *
 * Mặc định là `admin` (hoạt động quản trị): sự kiện gửi thư / người nhận chiếm phần lớn bảng (mỗi thư vài dòng) và sẽ
 * vùi mất việc người quản trị làm.
 */
export const AUDIT_GROUPS = {
  security: ['AdminSignedIn', 'AdminSignedOut', 'LoginLocked', 'AdminLocked', 'LoginUnlocked', 'AdminPasswordChanged', 'AdminMicrosoftLinked'],
  people: [
    'AccountCreated',
    'AdminCreated',
    'AdminMemberListedChanged',
    'TenantDirectorySynced',
    'OrganizationCreated',
    'OrgMemberSet',
    'OrgMemberRemoved',
    'AdminAppRoleGranted',
    'AdminAppRoleRevoked',
  ],
  apps: [
    'AppCreated',
    'AppSubmittedForReview',
    'AppApproved',
    'AppRejected',
    'AppSuspended',
    'AppResumed',
    'AppRevoked',
    'AppSecretIssued',
    'AppSecretRevoked',
    'AppNetworkRuleAdded',
    'AppNetworkRuleRemoved',
    'AppOpenTrackingChanged',
    'AppSendWindowChanged',
    'AppPacingChanged',
    'AppPacingCeilingChanged',
    'WebhookEndpointCreated',
    'WebhookEndpointUpdated',
    'WebhookEndpointDeleted',
    'WebhookSecretRotated',
    'IncomingHookCreated',
    'IncomingHookUpdated',
    'IncomingHookDeleted',
    'IncomingHookTokenRotated',
    'IncomingHookUrlRevealed',
  ],
  content: [
    'TemplateCreated',
    'TemplateRenamed',
    'TemplateCategoryChanged',
    'TemplateDraftSaved',
    'TemplateVersionPublished',
    'TemplateArchived',
    'TemplatePurged',
    'TopicCreated',
    'TopicActivated',
    'TopicSuspended',
    'TopicMandatoryChanged',
  ],
  settings: ['SystemSettingsUpdated'],
  sending: [
    'NotificationQueued',
    'NotificationScheduled',
    'NotificationSent',
    'NotificationFailed',
    'NotificationNoRecipient',
    'NotificationOpened',
    'TopicPublished',
    'UserCreated',
    'UserDeleted',
    'UserRestored',
    'SubscriptionCreated',
    'SubscriptionAddressChanged',
    'SubscriptionOptedOutOptionalChanged',
    'SubscriptionUnsubscribed',
    'SubscriptionResubscribed',
    'UserTopicPreferenceChanged',
  ],
} as const

export type AuditGroup = 'admin' | 'all' | keyof typeof AUDIT_GROUPS
export const AUDIT_GROUP_KEYS: readonly AuditGroup[] = ['admin', 'security', 'people', 'apps', 'content', 'settings', 'sending', 'all']

/** Sự kiện của một nhóm; `undefined` = không lọc (Tất cả). */
export function actionsOf(group: AuditGroup): readonly string[] | undefined {
  if (group === 'all') return undefined
  if (group === 'admin') return [...AUDIT_GROUPS.security, ...AUDIT_GROUPS.people, ...AUDIT_GROUPS.apps, ...AUDIT_GROUPS.content, ...AUDIT_GROUPS.settings]
  return AUDIT_GROUPS[group]
}

export type AuditRange = '24h' | '7d' | '30d' | 'all'
export const AUDIT_RANGES: readonly AuditRange[] = ['24h', '7d', '30d', 'all']
const RANGE_MS: Record<Exclude<AuditRange, 'all'>, number> = { '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5 }

/** Đầu khoảng thời gian (ISO) tính từ `now`; `undefined` = không giới hạn. */
export function fromOf(range: AuditRange, now: number): string | undefined {
  return range === 'all' ? undefined : new Date(now - RANGE_MS[range]).toISOString()
}

export const isAuditGroup = (v: unknown): v is AuditGroup => typeof v === 'string' && (AUDIT_GROUP_KEYS as readonly string[]).includes(v)
export const isAuditRange = (v: unknown): v is AuditRange => typeof v === 'string' && (AUDIT_RANGES as readonly string[]).includes(v)
