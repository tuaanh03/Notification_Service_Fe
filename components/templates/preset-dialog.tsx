'use client'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { LayoutTemplate } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createFromPresetAction } from '@/app/templates/actions'
import { useApp } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { LocaleFlag } from '@/components/locale-flag'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { presetErrorOf, presetsOf, type useTemplatePresets } from '@/hooks/use-template-presets'
import { LOCALES, type Locale } from '@/i18n/locales'
import type { TemplatePresetDto } from '@/lib/api/types'
import { renderPreview } from '@/lib/template-syntax'
import { variableLabel } from '@/lib/variable-labels'
import { VISUAL_DESIGN_FORMAT, VISUAL_DESIGN_VERSION } from '@/lib/visual-design'
import { DevicePreview } from './preview-pane'
import { compileMjml, type CompiledMjml } from './visual/compile-mjml'

/**
 * Hộp xem trước một mẫu: Máy tính / Điện thoại (dùng chung `DevicePreview` với màn soạn), chọn ngôn ngữ THƯ
 * (mặc định theo màn hình), tên gợi ý sẵn theo ngôn ngữ thư, "Dùng mẫu" -> template mới kiểu trực quan, sang màn soạn.
 * Lỗi (trùng tên…) hiện ngay trong hộp như hộp Nhân bản. Nơi gọi truyền `key` theo mẫu để ô tên không giữ
 * giá trị của mẫu trước (bẫy mục 6).
 *
 * Mở hộp là biên dịch ngay MJML của mẫu (`compileMjml` — GrapesJS + grapesjs-mjml không giao diện, ADR-0037 của
 * backend): xem trước hiện ĐÚNG thư sẽ được tạo, và "Dùng mẫu" gửi luôn bản đó (`html` + dự án + MJML). Chưa biên
 * dịch xong thì xem trước tạm bằng `html` ảnh thu nhỏ của backend.
 */
export function PresetDialog({
  preset,
  library,
  screenLocale,
  onClose,
}: {
  preset: TemplatePresetDto | null
  library: ReturnType<typeof useTemplatePresets>
  screenLocale: Locale
  onClose: () => void
}) {
  const t = useTranslations('templatePresets')
  const te = useTranslations('errors')
  const tl = useTranslations('locale')
  const tcat = useTranslations('templateCategory')
  const { app } = useApp()
  const router = useAppRouter()
  const [mailLocale, setMailLocale] = useState<Locale>(screenLocale)
  const [name, setName] = useState(preset?.name ?? '')
  // Người soạn chưa sửa tên thì đổi ngôn ngữ thư là đổi luôn tên gợi ý.
  const [nameEdited, setNameEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  /** Bản biên dịch theo `id/ngôn ngữ` — đổi qua lại ngôn ngữ không biên dịch lại; lỗi thì bỏ để thử lại được. */
  const builds = useRef(new Map<string, Promise<CompiledMjml>>())
  const build = useCallback((p: TemplatePresetDto) => {
    const key = `${p.id}/${p.locale}`
    let job = builds.current.get(key)
    if (!job) {
      job = compileMjml(p.mjml)
      builds.current.set(key, job)
      job.catch(() => builds.current.delete(key))
    }
    return job
  }, [])
  const [compiled, setCompiled] = useState<{ key: string; html: string } | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)

  const { load } = library
  useEffect(() => load(mailLocale), [mailLocale, load])
  const loaded = library.state[mailLocale]
  const shown = presetsOf(loaded)?.find((p) => p.id === preset?.id) ?? (mailLocale === preset?.locale ? preset : null)
  const loadError = presetErrorOf(loaded)

  const pickLocale = (next: Locale) => {
    setMailLocale(next)
    setError(null)
  }
  // Đổi ngôn ngữ thư (hoặc bản ngôn ngữ đó vừa nạp xong) mà tên chưa sửa -> gợi ý theo ngôn ngữ thư.
  useEffect(() => {
    if (!nameEdited && shown) setName(shown.name)
  }, [shown, nameEdited])

  const shownKey = shown ? `${shown.id}/${shown.locale}` : null
  useEffect(() => {
    if (!shown) return
    let alive = true
    const key = `${shown.id}/${shown.locale}`
    setCompileError(null)
    build(shown).then(
      (out) => alive && setCompiled({ key, html: out.html }),
      (err: unknown) => alive && setCompileError(err instanceof Error ? err.message : String(err)),
    )
    return () => {
      alive = false
    }
  }, [shown, build])
  const previewHtml = compiled && compiled.key === shownKey ? compiled.html : shown?.html

  const use = () =>
    startTransition(async () => {
      if (!preset || !shown) return
      let out: CompiledMjml
      try {
        out = await build(shown)
      } catch (err) {
        setError(t('compileFailed', { message: err instanceof Error ? err.message : String(err) }))
        return
      }
      const result = await createFromPresetAction(app.app_id, {
        presetId: preset.id,
        locale: mailLocale,
        name: name.trim(),
        html: out.html,
        design: { format: VISUAL_DESIGN_FORMAT, version: VISUAL_DESIGN_VERSION, project: out.project, mjml: out.mjml },
      })
      if (result.ok) router.replace(`/templates/${result.data.id}`)
      else setError(te('withCode', { message: result.message, code: result.code }))
    })

  return (
    <Dialog open={preset !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="z-[100] max-h-[92vh] max-w-5xl grid-cols-[minmax(0,1fr)] overflow-y-auto rounded-2xl p-6 sm:max-w-5xl" data-testid="preset-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <LayoutTemplate className="size-4 text-[var(--starlight)]" aria-hidden="true" /> {shown?.name ?? preset?.name}
            {preset && <Badge variant="outline" className="text-[10px]">{tcat(preset.category)}</Badge>}
          </DialogTitle>
          <DialogDescription>{shown?.description ?? preset?.description}</DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="h-[520px] min-w-0 overflow-hidden rounded-xl border border-[var(--orbit)]">
            {shown ? (
              <DevicePreview
                subject={renderPreview(shown.subject, shown.variables, { escape: false })}
                html={renderPreview(previewHtml ?? shown.html, shown.variables, { escape: true })}
                loading={previewHtml === shown.html && !compileError}
                notice={
                  compileError && (
                    <p className="shrink-0 border-b border-[var(--orbit)] bg-[var(--supernova)]/5 px-4 py-1.5 text-[11px] text-[var(--supernova)]" data-testid="preset-compile-error">
                      {t('compileFailed', { message: compileError })}
                    </p>
                  )
                }
              />
            ) : (
              <p className="p-4 text-xs text-[var(--text-muted)]">
                {loadError ? te('withCode', { message: loadError.message, code: loadError.code }) : t('loading')}
              </p>
            )}
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim() && shown) use()
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('mailLanguage')}</Label>
              <ToggleGroup
                variant="outline"
                size="sm"
                value={[mailLocale]}
                onValueChange={(v) => {
                  const next = LOCALES.find((l) => l === v[0])
                  if (next) pickLocale(next)
                }}
                aria-label={t('mailLanguage')}
              >
                {LOCALES.map((l) => (
                  <ToggleGroupItem key={l} value={l} className="gap-1.5 text-xs" data-testid={`preset-locale-${l}`}>
                    <LocaleFlag locale={l} /> {tl(l)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-name" className="text-xs font-semibold">{t('name')}</Label>
              <Input
                id="preset-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameEdited(true)
                  setError(null)
                }}
                maxLength={200}
              />
              {error && (
                <p className="text-xs text-[var(--supernova)]" data-testid="preset-error">{error}</p>
              )}
            </div>
            {shown && shown.variables.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold">{t('variables')}</p>
                <div className="flex flex-wrap gap-1">
                  {shown.variables.map((v) => (
                    <Badge key={v.name} variant="outline" className="max-w-full truncate text-[10px]" title={v.name}>{variableLabel(v)}</Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-[var(--text-muted)]">{t('hint')}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending || !name.trim() || !shown} data-testid="preset-use">
                {pending ? t('using') : t('use')}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
