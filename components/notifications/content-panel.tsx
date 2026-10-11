'use client'
import { useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MailFrame } from '@/components/mail-frame'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { notificationCounters, renderTemplate, templateLabel, templates, type Notification } from '@/lib/mock-data'

const SAMPLE_VALUES: Record<string, string> = {
  alert_title: 'CPU cao',
  vm_name: 'vm-prod-17',
  vm_ip: '10.20.4.17',
  threshold: '90',
  current_usage: '97',
  owner: 'minh.tran',
  action_url: 'https://ops.enterprise.vn/vm/17',
}

/** 07 §B4 — nội dung đã gửi trong khung thiết bị; nhiều audience → tab theo template kèm số người. */
export function ContentPanel({ notification }: { notification: Notification }) {
  const tr = useTranslations('content')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const c = notificationCounters(notification)
  const primary = templates.find((t) => templateLabel(t) === notification.template)
  // multi-audience (UC-002 §C5): topic warning_resources có bản hành động + bản theo dõi
  const variants = notification.topic_key === 'hypervisor.warning_resources'
    ? templates.filter((t) => ['vm_high_load', 'vm_high_load_readonly'].includes(t.key))
    : primary
      ? [primary]
      : []
  const frameOf = (tpl: (typeof templates)[number]) => (
    <MailFrame
      device={device}
      header={`template_id ${tpl.key} · ${tpl.published ?? 'v1'}`}
      subject={renderTemplate(tpl.subject ?? '', SAMPLE_VALUES)}
      body={renderTemplate(tpl.body ?? '', SAMPLE_VALUES)}
    />
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-secondary)]">{tr('sentVersion')}</p>
        <ToggleGroup variant="outline" size="sm" value={[device]} onValueChange={(v) => setDevice((v[0] as 'desktop' | 'mobile' | undefined) ?? device)}>
          <ToggleGroupItem value="desktop" aria-label="Desktop">
            <Monitor /> Desktop
          </ToggleGroupItem>
          <ToggleGroupItem value="mobile" aria-label="Mobile">
            <Smartphone /> Mobile
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {variants.length === 0 && (
        <MailFrame device={device} subject={tr('quickSubject')} body={tr('noTemplate')} />
      )}
      {variants.length === 1 && frameOf(variants[0])}
      {variants.length > 1 && (
        <Tabs defaultValue={variants[0].key}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
            {variants.map((t, i) => (
              <TabsTrigger key={t.key} value={t.key} className="px-2.5 font-mono">
                {templateLabel(t)}
                <span className="ml-1 tabular-nums text-[var(--text-muted)]">· {i === 0 ? c.sent - Math.floor(c.sent / 3) : Math.floor(c.sent / 3)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {variants.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-3">
              {frameOf(t)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
