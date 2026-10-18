/**
 * Nhóm template — sao đúng `TEMPLATE_CATEGORIES` của backend (`shared/kernel/enums.ts`, ADR-0033).
 * Bộ cố định: thêm nhóm là sửa cả hai bên + chữ ở nhóm `templateCategory` của `messages/*.json`.
 */
export const TEMPLATE_CATEGORIES = ['alert', 'system', 'onboarding', 'reminder', 'approval', 'report', 'other'] as const
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

export const isTemplateCategory = (value: string): value is TemplateCategory =>
  (TEMPLATE_CATEGORIES as readonly string[]).includes(value)
