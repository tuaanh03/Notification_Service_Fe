'use client'
import { useState } from 'react'
import { AppLink } from '@/components/app-link'
import { ChevronLeft, ChevronRight, ShieldX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { OrbitStepper } from '@/components/apps/orbit-stepper'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { importPreview } from '@/lib/mock-data'
import { ImportStepPreview, type ConflictDecision } from './import-step-preview'
import { ImportStepSpec } from './import-step-spec'

/** UC-002 §C — import CSV 3 bước dry-run. Thiếu cột bắt buộc → từ chối cả file, không ghi gì. */
export function ImportWizard() {
  const t = useTranslations('import')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const steps = [t('stepTemplate'), t('stepPreview'), t('stepResult')]
  const [step, setStep] = useState(0)
  const [rejected, setRejected] = useState(false)
  const [attach, setAttach] = useState({ on: false, topic: '' })
  const [decisions, setDecisions] = useState<Record<number, ConflictDecision>>({})
  const p = importPreview
  const allDecided = p.conflicts.every((c) => decisions[c.line]?.choice && decisions[c.line]?.note.trim())
  const skipped = p.conflicts.filter((c) => decisions[c.line]?.choice === 'skip').length
  const mergedFromConflict = p.conflicts.length - skipped
  return (
    <div className="mx-auto max-w-5xl">
      <OrbitStepper steps={steps} step={step} />
      <Panel className="p-5 sm:p-7" glow={step === 2}>
        {step === 0 && (
          <>
            {rejected && (
              <Alert variant="destructive" className="mb-5 border-[var(--supernova)]/40 bg-[var(--supernova)]/10" data-testid="rejected">
                <ShieldX />
                <AlertTitle className="text-[var(--supernova)]">{t('rejectedTitle')}</AlertTitle>
                <AlertDescription className="text-[var(--supernova)]">
                  {t.rich('rejectedBody', { mono })}
                </AlertDescription>
              </Alert>
            )}
            <ImportStepSpec
              attach={attach}
              onAttach={setAttach}
              onUpload={(kind) => {
                if (kind === 'missing_column') setRejected(true)
                else {
                  setRejected(false)
                  setStep(1)
                }
              }}
            />
          </>
        )}
        {step === 1 && (
          <>
            <ImportStepPreview decisions={decisions} onDecide={(line, next) => setDecisions((d) => ({ ...d, [line]: next }))} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--orbit)] pt-5">
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ChevronLeft /> {t('back')}
              </Button>
              <div className="flex items-center gap-3">
                {!allDecided && <span className="text-xs text-[var(--supernova)]">{t('undecided')}</span>}
                <Button disabled={!allDecided} onClick={() => setStep(2)}>
                  {t('confirm')} <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <div className="space-y-5" data-testid="import-result">
            <h2 className="text-lg font-semibold">{t('stepResult')}</h2>
            <dl className="grid gap-3 font-mono text-sm tabular-nums sm:grid-cols-4">
              {(
                [
                  [t('created'), p.createdTotal],
                  [t('merged'), p.mergedTotal + mergedFromConflict],
                  [t('skipped'), skipped + p.errors.length],
                  [t('bindings'), attach.on && attach.topic ? p.createdTotal + p.mergedTotal : 0],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-[var(--orbit)] p-3">
                  <dt className="font-sans text-xs text-[var(--text-secondary)]">{k}</dt>
                  <dd className="mt-1 text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
            {attach.on && attach.topic && (
              <p className="text-xs text-[var(--text-secondary)]">
                {t.rich('attached', { topic: attach.topic, mono })}
              </p>
            )}
            <Alert className="border-[var(--starlight)]/30 bg-[var(--starlight)]/[.06]">
              <AlertDescription className="text-[var(--text-secondary)]">
                {t('idempotent')}
              </AlertDescription>
            </Alert>
            <p className="text-xs text-[var(--text-muted)]">
              {t('auditNote', { count: p.conflicts.length })}
            </p>
            <Button variant="outline" render={<AppLink href="/users" />}>
              {t('backToUsers')}
            </Button>
          </div>
        )}
      </Panel>
    </div>
  )
}
