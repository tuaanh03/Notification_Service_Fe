import 'server-only'
import { adminFetch } from './client'
import type {
  AdminPersonalAccessTokenDto,
  IssuedPersonalAccessTokenDto,
  PatScope,
  PersonalAccessTokenDto,
} from './types'

/**
 * Personal access token (ADR-0041 của backend). Mọi route ở đây CHỈ nhận phiên — console luôn gọi bằng phiên nên
 * không gặp `SESSION_REQUIRED`. Token gốc `ewspat_…` chỉ đi qua `createMyToken`, không ghi log, không lưu lại.
 */

export async function listMyTokens(): Promise<PersonalAccessTokenDto[]> {
  return (await adminFetch<{ tokens: PersonalAccessTokenDto[] }>('/me/tokens')).tokens
}

export async function createMyToken(input: { name: string; scope: PatScope; expiresInDays: number }): Promise<IssuedPersonalAccessTokenDto> {
  return adminFetch<IssuedPersonalAccessTokenDto>('/me/tokens', { method: 'POST', body: input })
}

/** Đã thu hồi thì vẫn 204 — bấm lặp an toàn. */
export async function revokeMyToken(tokenId: string): Promise<void> {
  await adminFetch<void>(`/me/tokens/${encodeURIComponent(tokenId)}`, { method: 'DELETE' })
}

/** Super Admin: PAT của mọi người — để dập token bị lộ. */
export async function listAllTokens(status: 'active' | 'all' = 'active'): Promise<AdminPersonalAccessTokenDto[]> {
  return (await adminFetch<{ tokens: AdminPersonalAccessTokenDto[] }>('/personal-access-tokens', { query: { status } })).tokens
}

export async function revokeAnyToken(tokenId: string): Promise<void> {
  await adminFetch<void>(`/personal-access-tokens/${encodeURIComponent(tokenId)}`, { method: 'DELETE' })
}
