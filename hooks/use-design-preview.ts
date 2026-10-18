'use client'
import { useEffect, useRef, useState } from 'react'
import { previewDesignAction } from '@/app/templates/actions'
import type { Issue } from '@/lib/api/problem'
import type { EmailDesign } from '@/lib/email-design'

/** Chờ người soạn ngừng tay bao lâu rồi mới hỏi backend (ADR-0034: ~400–600 ms). */
const DEBOUNCE_MS = 500

export type DesignPreview = { html: string; text: string }

/**
 * Xem trước thiết kế kéo-thả: HTML do BACKEND sinh (`POST …/templates/design-preview`) — console không
 * giữ bản sao hàm sinh. Gọi sau `DEBOUNCE_MS` kể từ lần sửa cuối; lần gọi cũ về muộn thì bỏ (tránh nhấp nháy).
 *
 * `design` = null (kiểu HTML / chưa sửa gì) -> không gọi, trả `null` để màn dùng HTML đã lưu.
 */
export function useDesignPreview(appId: string, design: EmailDesign | null) {
  const [preview, setPreview] = useState<DesignPreview | null>(null)
  const [error, setError] = useState<{ message: string; code: string; issues: readonly Issue[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (!design) {
      seq.current += 1
      setPreview(null)
      setError(null)
      setLoading(false)
      return
    }
    const mine = ++seq.current
    setLoading(true)
    const timer = setTimeout(() => {
      void previewDesignAction(appId, design).then((result) => {
        if (mine !== seq.current) return
        setLoading(false)
        if (result.ok) {
          setPreview(result.data)
          setError(null)
        } else {
          setError({ message: result.message, code: result.code, issues: result.issues ?? [] })
        }
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [appId, design])

  return { preview, error, loading }
}
