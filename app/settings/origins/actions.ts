'use server'

import { addNetworkRule, listNetworkRules, removeNetworkRule } from '@/lib/api/apps'
import { listAudit, toAuditEntry, NETWORK_RULE_AUDIT_ACTIONS } from '@/lib/api/audit'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { NetworkRuleDto } from '@/lib/api/types'
import type { AuditEntry } from '@/lib/mock-data'

/**
 * BFF của màn IP & Origin — allowlist nguồn gọi `/v1/*` của app đang xem. Server Action như
 * `/settings/credentials` (CLAUDE.md mục 2.2): `EWS_ADMIN_TOKEN` không rời phía server.
 */

export type NetworkRulesView = { rules: NetworkRuleDto[]; audit: AuditEntry[] }

export async function loadNetworkRulesAction(appId: string): Promise<ActionResult<NetworkRulesView>> {
  return toResult(async () => {
    const [rules, audit] = await Promise.all([listNetworkRules(appId), listAudit('App', appId)])
    return {
      rules,
      audit: audit
        .filter((e) => (NETWORK_RULE_AUDIT_ACTIONS as readonly string[]).includes(e.action))
        .map(toAuditEntry),
    }
  })
}

export async function addNetworkRuleAction(appId: string, rule: NetworkRuleDto): Promise<ActionResult<NetworkRuleDto>> {
  return toResult(() => addNetworkRule(appId, rule))
}

export async function removeNetworkRuleAction(appId: string, rule: NetworkRuleDto): Promise<ActionResult<void>> {
  return toResult(() => removeNetworkRule(appId, rule))
}
