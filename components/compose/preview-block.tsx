'use client'
import { useEffect, useState } from 'react'
import { FlaskConical, Monitor, Smartphone, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MailFrame } from '@/components/mail-frame'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { renderTemplate, templateLabel, templates, unresolvedVariables } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { ContentSelection } from './content-block'
import { TestSendDialog, type TestSendMode } from './test-send-dialog'

/** Subject/body đã render cho preview — một helper để block 3 và dialog gửi thử dùng chung. */
export function renderContent(content: ContentSelection) {
  if (content.mode === 'quick') return { subject: content.quickSubject, body: content.quickBody, unresolved: [] as string[] }
  const tpl = templates.find((t) => templateLabel(t) === content.template)
  if (!tpl) return { subject: '', body: '', unresolved: [] as string[] }
  const subject = renderTemplate(tpl.subject ?? '', content.values)
  const body = renderTemplate(tpl.body ?? '', content.values)
  return { subject, body, unresolved: Array.from(new Set([...unresolvedVariables(subject), ...unresolvedVariables(body)])) }
}

/**
 * Block 3. "Đã xem thử" được đánh dấu khi block mount (UC-008 BR-5) — không IntersectionObserver,
 * không nút tay. Còn `{{ }}` sót → banner đỏ + báo Composer khoá Gửi.
 */
export function PreviewBlock({
  topic,
  content,
  onOpen,
  onUnresolved,
}: {
  topic: string
  content: ContentSelection
  onOpen: () => void
  onUnresolved: (vars: string[]) => void
}) {
  const t = useTranslations('previewBlock')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [testMode, setTestMode] = useState<TestSendMode>(null)
  useEffect(() => onOpen(), [onOpen])
  const { subject, body, unresolved } = renderContent(content)
  const hasContent = content.mode === 'quick' ? Boolean(content.quickBody) : Boolean(content.template)
  // báo lên Composer mỗi khi tập biến sót đổi (BR-5: còn {{ }} thì Gửi khoá)
  const unresolvedKey = unresolved.join(',')
  useEffect(() => onUnresolved(unresolvedKey ? unresolvedKey.split(',') : []), [onUnresolved, unresolvedKey])

  const frame = (
    <MailFrame
      device={device}
      subject={hasContent ? subject || t('noSubject') : t('noContent')}
      body={hasContent ? body : t('noContentBody')}
    />
  )
  return (
    <Panel className={cn('p-5', unresolved.length ? 'border-[var(--supernova)]/40' : 'border-[var(--starlight)]/30')}>
      <div className="flex gap-4">
        <Badge
          variant="outline"
          className="size-7 shrink-0 rounded-full border-[var(--starlight)]/60 px-0 font-mono text-sm text-[var(--starlight)]"
        >
          3
        </Badge>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--starlight)]">block 03</p>
              <h2 className="font-heading text-lg font-semibold">{t('blockTitle')}</h2>
            </div>
            <ToggleGroup
              variant="outline"
              size="sm"
              value={[device]}
              onValueChange={(v) => setDevice((v[0] as 'desktop' | 'mobile' | undefined) ?? device)}
            >
              <ToggleGroupItem value="desktop" aria-label="Desktop">
                <Monitor /> Desktop
              </ToggleGroupItem>
              <ToggleGroupItem value="mobile" aria-label="Mobile">
                <Smartphone /> Mobile
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {unresolved.length > 0 && (
            <Alert variant="destructive" className="border-[var(--supernova)]/40 bg-[var(--supernova)]/10">
              <AlertDescription className="text-[var(--supernova)]">
                {t.rich('unresolved', {
                  count: unresolved.length,
                  vars: unresolved.map((v) => `{{${v}}}`).join(' '),
                  mono,
                })}
              </AlertDescription>
            </Alert>
          )}
          {topic === 'hypervisor.warning_resources' && content.mode === 'template' ? (
            <Tabs defaultValue="action">
              <TabsList>
                <TabsTrigger value="action">{t('actionVersion')}</TabsTrigger>
                <TabsTrigger value="readonly">{t('readonlyVersion')}</TabsTrigger>
              </TabsList>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{t.rich('audienceSplit', { mono })}</p>
              <TabsContent value="action" className="mt-3">
                {frame}
              </TabsContent>
              <TabsContent value="readonly" className="mt-3">
                {frame}
              </TabsContent>
            </Tabs>
          ) : (
            frame
          )}
          {/* UC-008 §D — gửi thử: chỉ tôi hoặc nhóm rà soát khai sẵn, không có ô email */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!hasContent} onClick={() => setTestMode('me')}>
              <FlaskConical /> {t('testMe')}
            </Button>
            <Button variant="outline" size="sm" disabled={!hasContent} onClick={() => setTestMode('reviewers')}>
              <Users /> {t('testReviewers')}
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">{t.rich('autoOpened', { mono })}</p>
        </div>
      </div>
      <TestSendDialog mode={testMode} subject={subject} onClose={() => setTestMode(null)} />
    </Panel>
  )
}
