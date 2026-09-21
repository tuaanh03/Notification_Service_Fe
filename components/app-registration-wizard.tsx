'use client'
import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAppRouter } from '@/components/app-link'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { OrbitStepper } from './apps/orbit-stepper'
import { StepProfile } from './apps/step-profile'
import { StepTopics } from './apps/step-topics'
import { StepReview } from './apps/step-review'
import { StepWaiting } from './apps/step-waiting'
import {
  DEFAULT_GRANT,
  EMPTY_PROFILE,
  EMPTY_TOPIC,
  profileValid as isProfileValid,
  toGrant,
  topicsValid as areTopicsValid,
  type GrantDraft,
  type ProfileDraft,
  type TopicDraft,
} from './apps/wizard-types'
import { registerAppAction, type RegisterResult } from '@/app/apps/new/actions'
import { approveAndIssueKeyAction, type ApproveResult } from '@/app/admin/apps/actions'

const steps = ['Hồ sơ app', 'Chủ đề đầu tiên', 'Rà soát', 'Chờ duyệt']

/**
 * Wizard đăng ký app (UC-001) — state ở đây, từng bước ở `components/apps/step-*.tsx`.
 *
 * Bước 1–3 chỉ là nháp trong trình duyệt, chưa chạm hệ thống. Bấm gửi ở bước 3 mới ghi thật,
 * và từ đó KHÔNG quay lại được: app đã tồn tại, bấm lại chỉ dính trùng slug.
 */
export function AppRegistrationWizard() {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE)
  const [topics, setTopics] = useState<TopicDraft[]>([{ ...EMPTY_TOPIC }])
  const [grant, setGrant] = useState<GrantDraft>(DEFAULT_GRANT)
  const [acknowledged, setAcknowledged] = useState(false)
  const [registered, setRegistered] = useState<RegisterResult | null>(null)
  const [approved, setApproved] = useState<ApproveResult | null>(null)
  const [secretOpen, setSecretOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Danh sách app nạp ở layout (server). Không đọc lại thì app vừa tạo không có trong ô chọn app,
  // và link "Khoá API" / "Chủ đề" ở bước 4 (`?app=<slug mới>`) rơi vào trang chọn app báo "không có".
  const router = useAppRouter()

  const profileValid = isProfileValid(profile)
  const topicsValid = areTopicsValid(topics)

  const submit = () =>
    startTransition(async () => {
      setError(null)
      const result = await registerAppAction({
        profile: { slug: profile.slug, name: profile.name.trim(), namespace: profile.namespace, origin: profile.origin },
        rules: [
          ...profile.origins.map((value) => ({ kind: 'origin', value })),
          ...profile.ipAllowlist.map((value) => ({ kind: 'ip', value })),
        ],
        topics: topics.map((t) => ({ ...t, name: t.name.trim() })),
      })
      if (!result.ok) return setError(result.message)
      setRegistered(result.data)
      setStep(3)
      router.refresh()
    })

  const approve = () =>
    startTransition(async () => {
      setError(null)
      if (!registered) return
      const result = await approveAndIssueKeyAction(registered.app.app_id, toGrant(grant))
      if (!result.ok) return setError(result.message)
      setApproved(result.data)
      setSecretOpen(true)
      router.refresh()
    })

  const next = () => {
    if (step === 0 && !profileValid) return
    if (step === 1 && !topicsValid) return
    setStep((v) => Math.min(2, v + 1))
  }

  const current = approved?.app ?? registered?.app ?? null

  return (
    <div className="mx-auto max-w-5xl">
      <OrbitStepper steps={steps} step={step} />
      <motion.div
        key={step}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Panel className="p-5 sm:p-7" glow={step === 3} ring={step === 3}>
          {step === 0 && <StepProfile draft={profile} onChange={setProfile} />}
          {step === 1 && <StepTopics topics={topics} onChange={setTopics} />}
          {step === 2 && (
            <StepReview profile={profile} topics={topics} pending={pending} error={error} onSubmit={submit} />
          )}
          {step === 3 && registered && current && (
            <StepWaiting
              app={current}
              created={registered}
              grant={grant}
              onGrantChange={setGrant}
              acknowledged={acknowledged}
              onAcknowledgedChange={setAcknowledged}
              pending={pending}
              error={error}
              stop={approved?.stoppedAt ?? null}
              secret={secretOpen ? (approved?.secret ?? null) : null}
              onApprove={approve}
              onCloseSecret={() => setSecretOpen(false)}
            />
          )}
          {step < 2 && (
            <div className="mt-7 flex justify-between border-t border-[var(--orbit)] pt-5">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((v) => v - 1)}>
                  <ChevronLeft /> Quay lại
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={next} disabled={step === 0 ? !profileValid : !topicsValid}>
                Tiếp tục <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          )}
          {step === 2 && (
            <div className="mt-7 border-t border-[var(--orbit)] pt-5">
              <Button variant="ghost" disabled={pending} onClick={() => setStep(1)}>
                <ChevronLeft /> Quay lại
              </Button>
            </div>
          )}
        </Panel>
      </motion.div>
    </div>
  )
}
