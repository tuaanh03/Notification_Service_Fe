import { redirect } from 'next/navigation'
import { ADMIN_HOME } from '@/lib/app-routes'

/** `/admin` không có màn riêng — vào thẳng màn đầu của khu Quản trị EWS. */
export default function Page() {
  redirect(ADMIN_HOME)
}
