import { slugifyKey } from '@/lib/variable-labels'

/** Sao đúng `TOPIC_KEY` của backend (`admin-topics.routes.ts`): chữ thường, số, `_ . -`, bắt đầu bằng chữ, 2–128 ký tự. */
export const TOPIC_KEY_RE = /^[a-z][a-z0-9_.-]{1,127}$/

/**
 * Mã chủ đề tự sinh từ tên hiển thị (UX-11): "Cập nhật đơn hàng" -> `cap_nhat_don_hang`. Trùng mã đã có trong app thì
 * thêm `_2`, `_3`… (backend vẫn chặn trùng lần cuối — 409 `TOPIC_KEY_TAKEN`). Không dùng UUID: đội app viết mã này vào
 * code / cấu hình / incoming webhook, phải đọc được.
 */
export function topicKeyFrom(name: string, taken: ReadonlySet<string>): string {
  let base = slugifyKey(name).replace(/^v_/, 't_').slice(0, 120)
  if (base !== '' && !/^[a-z]/.test(base)) base = `t_${base}`
  if (base.length < 2) base = base === '' ? '' : `${base}_topic`
  if (base === '' || !taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}_${n}`)) return `${base}_${n}`
}
