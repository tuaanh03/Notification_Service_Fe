'use client'
import { useMemo } from 'react'
function seeded(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}
/**
 * Làm tròn trước khi đưa vào `style`: số thực đủ 17 chữ số được máy chủ và trình duyệt viết ra chuỗi
 * khác nhau (chuẩn hoá CSS) -> cảnh báo lệch hydration. Vài chữ số thập phân là đủ cho vị trí sao.
 */
const round = (value: number, digits: number) => Number(value.toFixed(digits))

export function CosmicBackground() {
  const stars = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => ({
        left: `${round(seeded(i + 1) * 100, 2)}%`,
        top: `${round(seeded(i + 99) * 100, 2)}%`,
        opacity: round(0.1 + seeded(i + 20) * 0.25, 3),
        size: 1 + Math.round(seeded(i + 40)),
        delay: `${round(seeded(i + 80) * 7, 2)}s`,
      })),
    [],
  )
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--void)]">
      <div className="absolute -left-32 -top-32 h-[38rem] w-[38rem] rounded-full bg-[var(--nebula-indigo)]/50 blur-[120px] motion-safe:animate-[drift_80s_ease-in-out_infinite_alternate]" />
      <div className="absolute -right-40 top-1/4 h-[34rem] w-[34rem] rounded-full bg-[var(--nebula-violet)]/40 blur-[120px] motion-safe:animate-[drift_95s_ease-in-out_infinite_alternate-reverse]" />
      <div className="absolute -bottom-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-[var(--nebula-teal)]/40 blur-[120px] motion-safe:animate-[drift_75s_ease-in-out_infinite_alternate]" />
      {stars.map((s, i) => (
        <i
          key={i}
          className="star motion-safe:animate-[twinkle_5s_ease-in-out_infinite]"
          style={{
            left: s.left,
            top: s.top,
            opacity: s.opacity,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}
      <div className="absolute left-0 right-0 top-16 h-px bg-gradient-to-r from-transparent via-[var(--orbit)] to-transparent" />
    </div>
  )
}
