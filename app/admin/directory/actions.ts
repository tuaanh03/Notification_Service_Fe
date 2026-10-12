'use server'

import { listDirectoryPeople, setMemberListed, syncDirectory, type ListDirectoryInput } from '@/lib/api/directory'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { DirectoryPeoplePageDto, DirectorySyncDto } from '@/lib/api/types'

/** Lớp BFF của màn Danh bạ (chỉ Super Admin — backend kiểm `platform.manage`). */

export async function loadDirectoryAction(input: ListDirectoryInput): Promise<ActionResult<DirectoryPeoplePageDto>> {
  return toResult(() => listDirectoryPeople(input))
}

export async function setMemberListedAction(adminIds: string[], listed: boolean): Promise<ActionResult<{ changed: number }>> {
  return toResult(() => setMemberListed(adminIds, listed))
}

/** Đồng bộ danh bạ M365 thành tài khoản EWS (ADR-0027 của backend). */
export async function syncDirectoryAction(): Promise<ActionResult<DirectorySyncDto>> {
  return toResult(() => syncDirectory())
}
