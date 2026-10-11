'use client'
import { Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Panel } from './panel'
import { SecretText } from './secret-text'

/** Thay mọi chỗ xuất hiện `secret.value` trong một dòng bằng <SecretText>; chép vẫn chép chuỗi thật. */
function withSecret(text: string, secret: { value: string; visible: boolean } | undefined) {
  if (!secret || !secret.value) return text
  return text.split(secret.value).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <SecretText value={secret.value} visible={secret.visible} />}
      {part}
    </Fragment>
  ))
}

export function CodeBlock({
  language,
  value,
  copyable = true,
  lineNumbers = false,
  secret,
}: {
  language: string
  value: string
  copyable?: boolean
  lineNumbers?: boolean
  /** Khoá nằm trong `value` cần che bằng lớp dạ quang khi `visible = false`. */
  secret?: { value: string; visible: boolean }
}) {
  const tc = useTranslations('common')
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--orbit)] px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        <span className="font-mono">{language}</span>
        {copyable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(value)
              toast.success(tc('copied'))
            }}
          >
            <Copy />
            {tc('copy')}
          </Button>
        )}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[var(--starlight)]">
        {lineNumbers
          ? value.split('\n').map((line, i) => (
              <div key={i}>
                <span className="mr-4 select-none tabular-nums text-[var(--text-muted)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {withSecret(line, secret)}
              </div>
            ))
          : withSecret(value, secret)}
      </pre>
    </Panel>
  )
}
