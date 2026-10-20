import type { TemplateVariableDto } from '@/lib/api/types'

/**
 * Nhãn dễ đọc của biến template — cho người không biết code thấy "Tên người nhận" thay vì
 * `payload.ten_nguoi_nhan`. Chỉ là lớp hiển thị: mã biến (`name`) vẫn là thứ lưu và gửi.
 */

/** `ten_nguoi_nhan` -> "Ten nguoi nhan" (biến chưa có mô tả). */
export function humanizeKey(path: string): string {
  const key = path.replace(/^(payload|user)\./, '').replace(/[_.]+/g, ' ').trim()
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : path
}

/** Nhãn của một biến: mô tả nếu có, không thì tên tự sinh. `user.external_id` có nhãn riêng do màn truyền vào. */
export function variableLabel(variable: Pick<TemplateVariableDto, 'name' | 'description'>): string {
  return variable.description?.trim() || humanizeKey(variable.name)
}

/**
 * "Phòng ban" -> `phong_ban`: bỏ dấu, chữ thường, ký tự khác chữ / số thành `_` — đúng luật tên biến của backend
 * (`payload.<key>`, chữ + số + `_`, không bắt đầu bằng số).
 */
export function slugifyKey(label: string): string {
  const key = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
  return /^[0-9]/.test(key) ? `v_${key}` : key
}

/** Tên biến (phần sau `payload.`) hợp lệ theo backend. */
export const VARIABLE_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Ký tự không cho trong giá trị mặc định: phá cú pháp Liquid / MJML hoặc thành HTML. */
export const FORBIDDEN_DEFAULT_RE = /["'<>{}|]/
