/**
 * Đường dẫn trang chi tiết một người nhận — MANG THEO app.
 *
 * App đang chọn chỉ nằm trong state client của `<AppProvider>`; tải lại trang là về app đầu tiên.
 * Không có `?app=`, link gửi cho đồng nghiệp sẽ tìm mã này trong app khác (cùng mã ở hai app là
 * hai người khác nhau). Mọi link sang `/users/[id]` phải đi qua hàm này.
 */
export function recipientHref(appSlug: string, externalId: string): string {
  return `/users/${encodeURIComponent(externalId)}?app=${encodeURIComponent(appSlug)}`
}
