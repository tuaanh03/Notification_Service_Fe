'use client'
import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useAppRouter } from '@/components/app-link'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OrbitStepper } from './apps/orbit-stepper'
import { StepProfile } from './apps/step-profile'
import { StepTopics } from './apps/step-topics'
import { StepReview } from './apps/step-review'
import { StepDone } from './apps/step-done'
import {
  EMPTY_PROFILE,
  EMPTY_TOPIC,
  profileValid as isProfileValid,
  topicsValid as areTopicsValid,
  type ProfileDraft,
  type TopicDraft,
} from './apps/wizard-types'
import { registerAppAction, type RegisterResult } from '@/app/apps/new/actions'
import { useRole } from './role-context'

/**
 * Wizard đăng ký app (UC-001) — state ở đây, từng bước ở `components/apps/step-*.tsx`.
 *
 * Bước 1–3 chỉ là nháp trong trình duyệt, chưa chạm hệ thống. Bấm tạo ở bước 3 mới ghi thật,
 * và từ đó KHÔNG quay lại được: app đã tồn tại, bấm lại chỉ dính trùng slug.
 * Không còn bước duyệt (ADR-0023 của backend): bước 4 trao khoá API đầu tiên cho người tạo.
 */
export function AppRegistrationWizard() {
  const t = useTranslations('wizard')
  const steps = [t('stepProfile'), t('stepTopics'), t('stepReview'), t('stepKey')]
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const { creatableOrgs } = useRole()
  // Chỉ một org được tạo app thì chọn sẵn; nhiều org thì bắt chọn ở bước 1.
  const [profile, setProfile] = useState<ProfileDraft>(() => ({
    ...EMPTY_PROFILE,
    orgId: creatableOrgs.length === 1 ? creatableOrgs[0]!.id : '',
  }))
  const [topics, setTopics] = useState<TopicDraft[]>([{ ...EMPTY_TOPIC }])
  const [registered, setRegistered] = useState<RegisterResult | null>(null)
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
        profile: {
          orgId: profile.orgId,
          slug: profile.slug,
          name: profile.name.trim(),
          namespace: profile.namespace,
          origin: profile.origin,
        },
        topics: topics.map((t) => ({ ...t, name: t.name.trim() })),
      })
      if (!result.ok) return setError(result.message)
      setRegistered(result.data)
      setStep(3)
      router.refresh()
    })

  const next = () => {
    if (step === 0 && !profileValid) return
    if (step === 1 && !topicsValid) return
    setStep((v) => Math.min(2, v + 1))
  }

  // Không phải Owner / Org Admin của org nào: nói rõ thay vì để điền xong rồi mới bị 403.
  if (creatableOrgs.length === 0) {
    return (
      <Alert className="mx-auto max-w-xl">
        <TriangleAlert />
        <AlertTitle>{t('noOrgTitle')}</AlertTitle>
        <AlertDescription>{t('noOrgBody')}</AlertDescription>
      </Alert>
    )
  }

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
          {step === 0 && <StepProfile draft={profile} orgs={creatableOrgs} onChange={setProfile} />}
          {step === 1 && <StepTopics topics={topics} onChange={setTopics} />}
          {step === 2 && (
            <StepReview profile={profile} topics={topics} pending={pending} error={error} onSubmit={submit} />
          )}
          {step === 3 && registered && (
            <StepDone
              app={registered.app}
              created={registered}
              secret={secretOpen ? registered.secret : null}
              onCloseSecret={() => setSecretOpen(false)}
            />
          )}
          {step < 2 && (
            <div className="mt-7 flex justify-between border-t border-[var(--orbit)] pt-5">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((v) => v - 1)}>
                  <ChevronLeft /> {t('back')}
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={next} disabled={step === 0 ? !profileValid : !topicsValid}>
                {t('next')} <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          )}
          {step === 2 && (
            <div className="mt-7 border-t border-[var(--orbit)] pt-5">
              <Button variant="ghost" disabled={pending} onClick={() => setStep(1)}>
                <ChevronLeft /> {t('back')}
              </Button>
            </div>
          )}
        </Panel>
      </motion.div>
    </div>
  )
}
