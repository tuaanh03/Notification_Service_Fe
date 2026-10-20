/**
 * Nút "Chèn biến" của thanh dưới (điện thoại) nằm NGOÀI cả khung thư lẫn ô tiêu đề — chạm vào nó là hai chỗ kia
 * mất focus. Ở đây nhớ người soạn vừa đặt con trỏ ở đâu (ô tiêu đề hay một khối chữ của thư) để chèn đúng chỗ.
 * Mỗi màn soạn chỉ có một bộ soạn trực quan nên trạng thái dùng chung trong module là đủ.
 */
type Where = 'subject' | 'body'

let last: Where | null = null
let openSubjectDialog: (() => void) | null = null

export const insertTarget = {
  mark(where: Where): void {
    last = where
  },
  last(): Where | null {
    return last
  },
  /** Ô tiêu đề đăng ký hàm mở hộp chèn của nó (null khi gỡ). */
  registerSubject(open: (() => void) | null): void {
    openSubjectDialog = open
    if (!open && last === 'subject') last = null
  },
  openSubject(): boolean {
    if (!openSubjectDialog) return false
    openSubjectDialog()
    return true
  },
}
