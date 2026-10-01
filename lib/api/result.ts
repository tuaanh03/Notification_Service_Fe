import { messageOf } from './error-message'
import { ApiError, type Issue } from './problem'

/**
 * Kết quả của một Server Action gọi backend.
 *
 * KHÔNG ném lỗi qua ranh giới server/client: ở bản production Next thay message thật
 * bằng chuỗi chung, người trực mất luôn lý do. Trả `code` ổn định của backend để màn
 * hình dựng exception path thật (CLAUDE.md mục 2.2).
 *
 * File này KHÔNG `server-only`: component client cần import type để nhận kết quả.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  /** `issues`: từng vi phạm của lỗi 422 (mã + ô sai) — màn soạn template chỉ đúng biến / ô bị sai. */
  | { ok: false; message: string; code: string; issues?: readonly Issue[] }

/** Bọc một lời gọi backend thành `ActionResult`. Lỗi không phải `ApiError` là bug -> vẫn ném. */
export async function toResult<T>(op: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await op() }
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    return { ok: false, message: await messageOf(err), code: err.code, ...(err.issues.length ? { issues: err.issues } : {}) }
  }
}

/**
 * Chỗ một CHUỖI nhiều lời gọi dừng lại.
 *
 * Backend không có lệnh gộp cho vòng đời app, nên vài thao tác là nhiều lời gọi liên tiếp
 * KHÔNG chung transaction. Khi phần đầu đã ghi thật rồi phần sau mới hỏng, trả `ActionResult`
 * thất bại là nói sai — màn hình phải nói được "đã làm tới đâu, dừng vì sao"
 * (CLAUDE.md mục 2.5).
 */
export type ActionStop = { step: string; message: string; code: string }
