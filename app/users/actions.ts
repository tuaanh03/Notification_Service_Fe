'use server'

import {
  getRecipient,
  getRecipientPreferences,
  listRecipients,
  type ListRecipientsInput,
  type RecipientDto,
  type RecipientPageDto,
  type UserPreferencesDto,
} from '@/lib/api/users'
import { toResult, type ActionResult } from '@/lib/api/result'

/**
 * Lớp BFF của màn Người nhận. Server Action vì dữ liệu phụ thuộc app đang chọn — app đó nằm
 * trong state client của `<AppProvider>` (CLAUDE.md mục 2.2).
 */

export async function loadRecipientsAction(
  appId: string,
  input: ListRecipientsInput = {},
): Promise<ActionResult<RecipientPageDto>> {
  return toResult(() => listRecipients(appId, input))
}

export async function loadRecipientAction(appId: string, externalId: string): Promise<ActionResult<RecipientDto>> {
  return toResult(() => getRecipient(appId, externalId))
}

export async function loadPreferencesAction(
  appId: string,
  externalId: string,
): Promise<ActionResult<UserPreferencesDto>> {
  return toResult(() => getRecipientPreferences(appId, externalId))
}
