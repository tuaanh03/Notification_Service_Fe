import { cn } from '@/lib/utils'

/** Ký tự giả cùng độ dài; giữ tiền tố `ews_` / `whsec_` để vẫn biết đây là loại khoá gì. */
function maskOf(value: string) {
  const prefix = /^[a-z]{2,8}_/.exec(value)?.[0] ?? ''
  return prefix + '•'.repeat(value.length - prefix.length)
}

/**
 * Chữ bí mật phủ lớp dạ quang. Đang ẩn thì DOM chỉ có ký tự giả — bôi đen, devtools, chụp màn hình
 * đều không lấy được khoá thật; hiện thì lớp màu co dần về bên phải để lộ chữ. Nền inline +
 * `box-decoration-clone` để lớp màu phủ đúng cả khi chuỗi xuống dòng (`break-all`).
 * Nút Sao chép ở nơi gọi vẫn chép giá trị thật.
 */
export function SecretText({ value, visible, className }: { value: string; visible: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-sm bg-gradient-to-r from-[var(--highlighter)] to-[var(--highlighter)] bg-right bg-no-repeat box-decoration-clone transition-[background-size,color] duration-500 ease-out',
        visible ? 'bg-[length:0%_100%]' : 'bg-[length:100%_100%] text-transparent select-none',
        className,
      )}
    >
      {visible ? value : maskOf(value)}
    </span>
  )
}
