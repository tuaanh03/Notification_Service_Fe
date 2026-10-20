'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Archive, CopyPlus, FileWarning, History, Monitor, Pencil, Redo2, Save, Smartphone, Sparkles, Undo2, UploadCloud } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { useApp } from '@/components/app-context'
import { useAppRouter, useLeaveGuard } from '@/components/app-link'
import { useRole } from '@/components/role-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useTemplateEditor, type EditorError } from '@/hooks/use-template-editor'
import { AiComposeDialog } from './ai-compose-dialog'
import { ComposeTab } from './compose-tab'
import { IntegrationTab } from './integration-tab'
import { useIssueText } from './issue-text'
import { SchemaPane } from './schema-pane'
import { TemplateActionsMenu } from './template-actions-menu'
import { VersionsPanel } from './versions-panel'
import type { VisualControls, VisualDevice, VisualHistory } from './visual/visual-editor'

/** Tab của màn soạn, giữ trên đường dẫn (`?tab=`) để tải lại / gửi link vẫn mở đúng tab. "compose" = không có tham số. */
const EDITOR_TABS = ['compose', 'variables', 'integration', 'versions'] as const
type EditorTab = (typeof EDITOR_TABS)[number]
const TAB_PARAM = 'tab'
const tabOf = (raw: string | null): EditorTab => EDITOR_TABS.find((x) => x === raw) ?? 'compose'

/**
 * Màn soạn một template (ADR-0020). Bốn tab: Soạn thư (mặc định, cho người không biết code) · Biến ·
 * Tích hợp cho đội app (mã template + lời gọi mẫu) · Phiên bản. Thanh đầu chỉ có Lưu nháp + Xuất bản; thao
 * tác phụ ở menu ⋯. Còn thay đổi chưa lưu thì hỏi trước khi rời trang (`useLeaveGuard`).
 *
 * Không có "Gửi thử": backend chưa có đường gửi thử. Xuất bản = lưu nháp rồi xuất bản (một action).
 */
export function TemplateEditor({ templateId }: { templateId: string }) {
  const t = useTranslations('templateEditor')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const tt = useTranslations('templates')
  const { app } = useApp()
  const router = useAppRouter()
  // App Viewer chỉ xem: khoá khung soạn, ẩn mọi nút ghi (backend vẫn chặn bằng 403).
  const writable = useRole().canManage(app)
  const ed = useTemplateEditor(app.app_id, templateId, !writable)
  /** Tên đang gõ ở ô Đổi tên; `null` = chưa gõ, ô hiện tên đã lưu. */
  const [nameEdit, setName] = useState<string | null>(null)
  const [publishWarn, setPublishWarn] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  /** Hộp Nhân bản: `dupRound` đổi mỗi lần mở để ô tên dựng lại, không giữ chữ của lần trước. */
  const [dupOpen, setDupOpen] = useState(false)
  const [dupRound, setDupRound] = useState(0)
  const [dupName, setDupName] = useState('')
  /** Mỗi lần mở hộp thoại AI là dựng lại từ đầu — không mang mô tả / đề xuất của lần trước. */
  const [aiRound, setAiRound] = useState(0)
  /** Bộ soạn trực quan (ADR-0036): thiết bị xem + nút hoàn tác ở thanh trên, điều khiển bộ soạn qua `visualControls`. */
  const [device, setDevice] = useState<VisualDevice>('desktop')
  const [visualControls, setVisualControls] = useState<VisualControls | null>(null)
  const [visualHistory, setVisualHistory] = useState<VisualHistory>({ canUndo: false, canRedo: false })

  const savedName = ed.detail?.name ?? ''
  const name = nameEdit ?? savedName
  /** Chưa lưu = nội dung đang soạn khác bản đã lưu, hoặc đã gõ tên mới mà chưa bấm Đổi tên. */
  const dirty = ed.dirty || (ed.detail !== null && name.trim() !== savedName)
  const leave = useLeaveGuard(dirty)

  // Đổi tab chỉ thay `?tab=` bằng history của trình duyệt — không chuyển trang, không mất nội dung đang soạn.
  const searchParams = useSearchParams()
  const tab = tabOf(searchParams.get(TAB_PARAM))
  const setTab = (next: EditorTab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'compose') params.delete(TAB_PARAM)
    else params.set(TAB_PARAM, next)
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  if (ed.loadError) {
    return (
      <>
        <PageHeader title="Template" breadcrumb={[{ label: tt('title'), href: '/templates' }, { label: templateId }]} />
        <EmptyState
          icon={FileWarning}
          title={ed.loadError.code === 'NOT_FOUND' ? t('notInApp') : t('loadFailed')}
          description={te('withCode', { message: ed.loadError.message, code: ed.loadError.code })}
          action={
            <Button variant="outline" onClick={() => void ed.reload()}>
              {t('retry')}
            </Button>
          }
        />
      </>
    )
  }
  if (!ed.detail) {
    return <PageHeader title={t('loading')} breadcrumb={[{ label: tt('title'), href: '/templates' }]} />
  }

  const detail = ed.detail
  const shown = ed.shown
  const nextVersion = Math.max(0, ...detail.versions.map((v) => v.version)) + 1

  const doPublish = async () => {
    setPublishWarn(false)
    const version = ed.draft?.version
    if (await ed.publish()) {
      toast.success(t('published', { version: version ?? '' }), { description: t('publishedBody') })
    }
  }
  const onPublish = () => (ed.newRequired.length > 0 ? setPublishWarn(true) : void doPublish())
  const openDuplicate = () => {
    setDupName(`${detail.name} ${t('copySuffix')}`.slice(0, 200))
    setDupRound((n) => n + 1)
    ed.clearError()
    setDupOpen(true)
  }
  // Lỗi (vd tên trùng) thì GIỮ hộp mở, hiện lỗi ngay dưới ô tên để sửa tại chỗ.
  const doDuplicate = async () => {
    const id = await ed.duplicate(dupName.trim())
    if (id) {
      setDupOpen(false)
      toast.success(t('duplicated'), { description: dupName.trim() })
      router.push(`/templates/${id}`)
    }
  }
  const visual = ed.editor === 'visual'
  const editorLabel = ed.legacy ? t('editorBlocks') : visual ? t('editorVisual') : t('editorHtml')
  /** Thanh thiết bị + hoàn tác chỉ khi bộ soạn trực quan đang mở (tab Soạn thư, có nháp). */
  const visualTools = visual && tab === 'compose' && !ed.locked
  const onSave = async () => {
    if (await ed.saveDraft()) toast.success(t('saved', { version: ed.draft?.version ?? nextVersion }))
  }

  const copyId = () => {
    navigator.clipboard?.writeText(detail.id)
    toast.success(tc('copied'), { description: detail.id })
  }
  const varProblems = ed.undeclared.length + ed.missingSource.length

  return (
    <>
      {/* Kiểu trực quan: thanh đầu DÍNH dưới thanh của khung (h-14) — Lưu / Xuất bản / thiết bị luôn trong tầm tay. */}
      <div className={cn(visual && 'sticky top-14 z-20 -mx-4 mb-4 bg-[var(--void)]/90 px-4 pt-2 backdrop-blur-md lg:-mx-6 lg:px-6 [&>header]:mb-3')}>
      <PageHeader
        title={detail.name}
        breadcrumb={[{ label: tt('title'), href: '/templates' }, { label: detail.name }]}
        subtitle={
          shown
            ? `v${shown.version} · ${editorLabel} · ${ed.locked ? t('readOnly') : t('editingDraft')}${dirty ? t('unsaved') : ''}`
            : undefined
        }
        actions={
          <>
            {visualTools && (
              // Điện thoại: không có Máy tính / Điện thoại (đang là điện thoại), Hoàn tác ở thanh dưới, Làm lại ở ⋯.
              <div className="hidden items-center gap-2 md:flex">
                <ToggleGroup
                  variant="outline"
                  size="sm"
                  value={[device]}
                  onValueChange={(v) => (v[0] === 'desktop' || v[0] === 'mobilePortrait') && setDevice(v[0])}
                  aria-label={t('device')}
                  data-testid="visual-device"
                >
                  <ToggleGroupItem value="desktop" aria-label={t('deviceDesktop')}>
                    <Monitor /> <span className="hidden xl:inline">{t('deviceDesktop')}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="mobilePortrait" aria-label={t('deviceMobile')}>
                    <Smartphone /> <span className="hidden xl:inline">{t('deviceMobile')}</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button variant="ghost" size="icon-sm" aria-label={t('undo')} title={t('undo')} disabled={!visualHistory.canUndo} onClick={() => visualControls?.undo()} data-testid="visual-undo">
                  <Undo2 />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={t('redo')} title={t('redo')} disabled={!visualHistory.canRedo} onClick={() => visualControls?.redo()} data-testid="visual-redo">
                  <Redo2 />
                </Button>
              </div>
            )}
            <StatusPill status={ed.archived ? 'archived' : (shown?.status ?? 'draft')} />
            {writable && !ed.archived && !ed.legacy && ed.draft && (
              <>
                {/* Kiểu trực quan trên điện thoại: Lưu nháp vào ⋯ để thanh đầu không tràn; Xuất bản vẫn thấy. */}
                <Button variant="outline" disabled={ed.pending} onClick={() => void onSave()} className={cn(visual && 'hidden md:inline-flex')}>
                  <Save /> {t('saveDraft')}
                </Button>
                <Button disabled={ed.pending} onClick={onPublish} data-testid="publish-btn">
                  <UploadCloud /> {t('publish', { version: ed.draft.version })}
                </Button>
              </>
            )}
            {writable && !ed.archived && !ed.legacy && !ed.draft && ed.published && (
              <Button disabled={ed.pending} onClick={() => void ed.draftFrom(ed.published!.version)}>
                <Pencil /> {t('edit', { version: nextVersion })}
              </Button>
            )}
            <TemplateActionsMenu
              disabled={ed.pending}
              onCopyId={copyId}
              onDuplicate={writable && !ed.legacy ? openDuplicate : undefined}
              onArchive={writable && !ed.archived ? () => setArchiveConfirm(true) : undefined}
              onSaveMobile={visual && writable && !ed.archived && ed.draft ? () => void onSave() : undefined}
              onRedoMobile={visualTools ? () => visualControls?.redo() : undefined}
              redoDisabled={!visualHistory.canRedo}
            />
          </>
        }
      />
      </div>

      <div className="space-y-5">
        {ed.error && <ErrorAlert error={ed.error} />}
        {ed.aiBanner && (
          <Alert className="bg-[var(--pulsar)]/10" data-testid="ai-banner">
            <Sparkles className="text-[var(--pulsar)]" />
            <AlertDescription>{t('aiBanner')}</AlertDescription>
          </Alert>
        )}
        {ed.archived && (
          <Alert data-testid="archived-notice">
            <Archive />
            <AlertDescription>
              {t.rich('archivedNotice', { mono: (chunks) => <span className="font-mono">{chunks}</span> })}
            </AlertDescription>
          </Alert>
        )}
        {ed.legacy && (
          // Kiểu kéo-thả cũ đã ngừng (ADR-0037 của backend): chỉ xem, không sửa / xuất bản / nhân bản được.
          <Alert className="bg-[var(--solar)]/10" data-testid="legacy-notice">
            <History className="text-[var(--solar)]" />
            <AlertTitle>{t('legacyTitle')}</AlertTitle>
            <AlertDescription>{t('legacyBody')}</AlertDescription>
          </Alert>
        )}
        {writable && !ed.archived && !ed.legacy && ed.locked && ed.published && (
          <Alert data-testid="locked-notice">
            <AlertDescription className="text-[var(--text-secondary)]">
              {t.rich('lockedNotice', { version: ed.published.version, em: (chunks) => <em>{chunks}</em> })}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as EditorTab)}>
          <TabsList variant="line" className="mb-2 h-auto w-full flex-wrap justify-start gap-1 group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="compose" className="flex-none px-2.5" data-testid="tab-compose">{t('tabCompose')}</TabsTrigger>
            <TabsTrigger value="variables" className="flex-none px-2.5" data-testid="tab-variables">
              {t('variables')}
              <Badge variant="outline" className="font-mono text-[10px] tabular-nums">{ed.variables.length}</Badge>
              {varProblems > 0 && (
                <span
                  className="size-1.5 rounded-full bg-[var(--supernova)]"
                  role="img"
                  aria-label={t('variablesNotice', { count: varProblems })}
                  data-testid="variables-problem-dot"
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex-none px-2.5" data-testid="tab-integration">{t('tabIntegration')}</TabsTrigger>
            <TabsTrigger value="versions" className="flex-none px-2.5" data-testid="tab-versions">{t('versions')}</TabsTrigger>
          </TabsList>
          <TabsContent value="compose" className="min-w-0">
            <ComposeTab
              ed={ed}
              writable={writable}
              name={name}
              onNameChange={setName}
              savedName={savedName}
              onAi={() => {
                setAiRound((n) => n + 1)
                setAiOpen(true)
              }}
              onShowVariables={() => setTab('variables')}
              visual={{ device, onControls: setVisualControls, onHistory: setVisualHistory }}
            />
          </TabsContent>
          <TabsContent value="variables" className="min-w-0">
            <Panel className="min-w-0 p-5">
              <SchemaPane ed={ed} locked={ed.locked} />
            </Panel>
          </TabsContent>
          <TabsContent value="integration" className="min-w-0">
            <IntegrationTab ed={ed} onCopyId={copyId} />
          </TabsContent>
          <TabsContent value="versions" className="min-w-0">
            <Panel className="min-w-0 p-5">
              <VersionsPanel ed={ed} />
            </Panel>
          </TabsContent>
        </Tabs>
      </div>

      {/* Còn thay đổi chưa lưu mà bấm link nội bộ / đổi app (useLeaveGuard). Đóng tab / tải lại do trình duyệt tự hỏi. */}
      <ConfirmDialog
        open={leave.pendingHref !== null}
        title={t('leaveTitle')}
        description={t('leaveBody')}
        confirmLabel={t('leaveConfirm')}
        cancelLabel={t('leaveStay')}
        onConfirm={leave.leave}
        onCancel={leave.stay}
      />
      <AiComposeDialog key={aiRound} open={aiOpen} ed={ed} onClose={() => setAiOpen(false)} />
      {/* Biến bắt buộc mới: từ lúc xuất bản, app chưa gửi biến đó thì mọi lần gửi bị từ chối. */}
      <ConfirmDialog
        open={publishWarn}
        tone="blocking"
        title={t('newRequiredTitle')}
        description={t('newRequiredBody', { version: ed.published?.version ?? '' })}
        facts={[
          [t('factNewVars'), ed.newRequired.join(', ')],
          [t('factWillPublish'), `v${ed.draft?.version ?? ''}`],
          [t('factAppError'), '422 MISSING_VARIABLE'],
        ]}
        confirmLabel={t('publishAnyway')}
        onConfirm={() => void doPublish()}
        onCancel={() => setPublishWarn(false)}
      />
      <ConfirmDialog
        key={`dup:${dupRound}`}
        open={dupOpen}
        icon={CopyPlus}
        title={t('duplicateTitle')}
        description={t('duplicateBody')}
        confirmLabel={t('duplicateConfirm')}
        confirmDisabled={ed.pending || !dupName.trim()}
        onConfirm={() => void doDuplicate()}
        onCancel={() => {
          setDupOpen(false)
          ed.clearError()
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="tpl-dup-name" className="text-xs font-semibold">{t('duplicateName')}</Label>
          <Input id="tpl-dup-name" value={dupName} onChange={(e) => setDupName(e.target.value)} maxLength={200} autoFocus />
          {ed.error && (
            <p className="text-xs text-[var(--supernova)]" data-testid="duplicate-error">
              {te('withCode', { message: ed.error.message, code: ed.error.code })}
            </p>
          )}
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={archiveConfirm}
        tone="blocking"
        title={t('archiveTitle', { name: detail.name })}
        description={t('archiveBody')}
        facts={[
          [t('factId'), detail.id],
          [t('factPublished'), ed.published ? `v${ed.published.version}` : '—'],
          [t('factAppError'), '422 TEMPLATE_ARCHIVED'],
        ]}
        confirmLabel={t('archiveForever')}
        onConfirm={() => {
          setArchiveConfirm(false)
          void ed.archive().then((ok) => ok && toast.success(t('archived')))
        }}
        onCancel={() => setArchiveConfirm(false)}
      />
    </>
  )
}

/** Lỗi của lệnh ghi. Xuất bản bị 422 thì liệt kê TỪNG vi phạm, kèm biến / ô bị sai. */
function ErrorAlert({ error }: { error: EditorError }) {
  const t = useTranslations('templateEditor')
  const issueText = useIssueText()
  return (
    <Alert variant="destructive" className="bg-[var(--supernova)]/10" data-testid="editor-error">
      <FileWarning />
      <AlertTitle>{error.issues.length ? t('publishFailed', { count: error.issues.length }) : error.message}</AlertTitle>
      <AlertDescription>
        {error.issues.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-xs">
            {error.issues.map((issue, i) => (
              <li key={i}>
                {issue.path && <span className="font-mono">{issue.path}: </span>}
                {issueText(issue)}{' '}
                <span className="font-mono text-[var(--text-muted)]">({issue.code})</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="font-mono text-xs">{t('code', { code: error.code })}</span>
        )}
      </AlertDescription>
    </Alert>
  )
}
