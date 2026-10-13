'use server'

import { issueSecret, listSecrets, revokeSecret } from '@/lib/api/apps'
import { listAudit, toAuditEntry, SECRET_AUDIT_ACTIONS } from '@/lib/api/audit'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { AppSecretDto, IssuedAppSecretDto } from '@/lib/api/types'
import type { AuditEntry } from '@/lib/mock-data'

/**
 * BFF của màn Credentials. Như `/topics`: app đang chọn nằm ở state client nên
 * dùng Server Action, token phiên không rời phía server (CLAUDE.md mục 2.2).
 *
 * `apiKey` plaintext chỉ đi qua đúng một response của `issueSecretAction` rồi thôi —
 * không ghi log, không lưu lại (UC-001 BR-4).
 */

export type CredentialsView = { secrets: AppSecretDto[]; audit: AuditEntry[] }

export async function loadCredentialsAction(appId: string): Promise<ActionResult<CredentialsView>> {
  return toResult(async () => {
    const [secrets, audit] = await Promise.all([
      listSecrets(appId),
      listAudit('App', appId),
    ])
    return {
      secrets,
      audit: audit
        .filter((e) => (SECRET_AUDIT_ACTIONS as readonly string[]).includes(e.action))
        .map(toAuditEntry),
    }
  })
}

export async function issueSecretAction(appId: string, name: string): Promise<ActionResult<IssuedAppSecretDto>> {
  return toResult(() => issueSecret(appId, name))
}

export async function revokeSecretAction(
  appId: string,
  secretId: string,
): Promise<ActionResult<AppSecretDto>> {
  return toResult(() => revokeSecret(appId, secretId))
}
