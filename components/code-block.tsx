'use client'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Panel } from './panel'

export function CodeBlock({
  language,
  value,
  copyable = true,
  lineNumbers = false,
}: {
  language: string
  value: string
  copyable?: boolean
  lineNumbers?: boolean
}) {
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
              toast.success('Đã sao chép')
            }}
          >
            <Copy />
            Sao chép
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
                {line}
              </div>
            ))
          : value}
      </pre>
    </Panel>
  )
}
