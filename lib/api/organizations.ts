import 'server-only'
import { adminFetch } from './client'
import type { OrganizationDto } from './types'

/** POST /admin/organizations — tạo org, người gọi thành Owner (ADR-0025 của backend). */
export function createOrganization(name: string): Promise<OrganizationDto> {
  return adminFetch<OrganizationDto>('/organizations', { method: 'POST', body: { name } })
}
