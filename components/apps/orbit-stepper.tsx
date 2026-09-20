import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Stepper "orbit path": N node trên một đường mảnh cyan→violet; node active phát sáng. Dùng ở wizard app (4) và import CSV (3). */
export function OrbitStepper({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="relative mb-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      <div className="absolute left-[10%] right-[10%] top-4 h-px bg-gradient-to-r from-[var(--starlight)] via-[var(--pulsar)] to-[var(--orbit)]" />
      {steps.map((label, index) => (
        <div key={label} className="relative z-10 flex flex-col items-center gap-2 text-center">
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-full border font-mono text-xs tabular-nums',
              index < step && 'border-[var(--starlight)] bg-[var(--starlight)] text-[var(--void)]',
              index === step &&
                'border-[var(--starlight)] bg-[var(--deep)] text-[var(--starlight)] shadow-[var(--glow-starlight)]',
              index > step && 'border-[var(--orbit)] bg-[var(--deep)] text-[var(--text-muted)]',
            )}
          >
            {index < step ? <Check className="size-4" /> : index + 1}
          </span>
          <span className={cn('text-[11px]', index === step ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
