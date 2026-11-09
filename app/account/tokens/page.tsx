import { TokensPage } from '@/components/account/tokens-page'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'
import { listMyTokens } from '@/lib/api/tokens'

/**
 * `/account/tokens` — khoá truy cập cá nhân của người đang đăng nhập (ADR-0044 của backend). Không thuộc app nào
 * (`isAccountRoute`). Server Component đọc bằng phiên; ghi qua Server Action rồi `router.refresh()`.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    return <TokensPage tokens={await listMyTokens()} error={null} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    return <TokensPage tokens={[]} error={await describeError(err)} />
  }
}
