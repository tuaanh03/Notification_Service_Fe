import 'server-only'
import { adminFetch } from './client'
import type { SystemSettingDto } from './types'

/** Cài đặt hệ thống (ADR-0030 của backend) — chỉ Super Admin. */
export async function getSystemSettings(): Promise<SystemSettingDto[]> {
  return (await adminFetch<{ settings: SystemSettingDto[] }>('/system-settings')).settings
}

/** Gửi MỘT PHẦN các khoá; `null` = về mặc định. Backend kiểm hết rồi mới ghi. */
export async function updateSystemSettings(values: Record<string, number | string | null>): Promise<SystemSettingDto[]> {
  return (await adminFetch<{ settings: SystemSettingDto[] }>('/system-settings', { method: 'PUT', body: { values } })).settings
}
