import 'server-only'
import { adminFetch } from './client'
import type { LoginLockDto } from './types'

/** Khoá đăng nhập đang giữ (ADR-0039 của backend) — chỉ Super Admin. */
export async function listLoginLocks(): Promise<LoginLockDto[]> {
  return (await adminFetch<{ locks: LoginLockDto[] }>('/login-locks')).locks
}

/** Mở khoá theo email (gỡ cả khoá hẳn) hoặc theo IP. Không còn gì để mở -> `NOT_FOUND`. */
export async function unlockLogin(target: { email: string } | { ip: string }): Promise<void> {
  await adminFetch<{ unlocked: true }>('/login-locks/unlock', { method: 'POST', body: target })
}
