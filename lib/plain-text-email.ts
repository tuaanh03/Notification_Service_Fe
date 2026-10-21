/**
 * Ô "Viết thẳng" của màn Gửi thông báo (C3): người gửi gõ CHỮ THƯỜNG, console đổi sang HTML an toàn — escape mọi ký tự
 * (gõ `<b>` là hiện đúng chữ `<b>`, không thành thẻ), dòng trống tách đoạn `<p>`, xuống dòng đơn thành `<br>`, link
 * `https://…` thành liên kết bấm được. Bản chữ thường gửi kèm làm `text` của thư (backend nhận cả hai).
 */
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]!)

/** Link https trong một dòng đã escape — dấu câu cuối (`.`, `,`, `)`…) không tính vào link. */
const URL_RE = /https:\/\/[^\s<>"']+?(?=[.,;:!?)\]]*(?:\s|$))/g

export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .filter((block) => block.trim() !== '')
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeHtml(line).replace(URL_RE, (url) => `<a href="${url}">${url}</a>`))
      return `<p>${lines.join('<br>')}</p>`
    })
    .join('\n')
}
