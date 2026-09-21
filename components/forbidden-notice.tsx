import { AppLink } from '@/components/app-link'
import { ShieldOff } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Trang 403 dùng chung (UC-002 §F, UC-008 §G): App Admin mở tài nguyên ngoài namespace app qua URL.
 * Là UI thật, không phải toast; nói rõ sự kiện đã vào audit.
 */
export function ForbiddenNotice({
  code = '403',
  title,
  description,
  backHref,
  backLabel,
  breadcrumb,
}: {
  code?: string
  title: string
  description: string
  backHref: string
  backLabel: string
  breadcrumb?: { label: string; href?: string }[]
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={`${code} — ${title}`} subtitle={description} />
      <Alert variant="destructive" className="border-[var(--supernova)]/30 bg-[var(--supernova)]/10">
        <ShieldOff />
        <AlertTitle className="font-mono text-[var(--supernova)]">{code}</AlertTitle>
        <AlertDescription className="text-[var(--text-primary)]">
          {description} Sự kiện đã được ghi vào audit log.
        </AlertDescription>
        <Button variant="link" render={<AppLink href={backHref} />} className="justify-self-start px-0">
          {backLabel}
        </Button>
      </Alert>
    </div>
  )
}
