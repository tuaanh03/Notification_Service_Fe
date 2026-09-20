'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { OrbitStepper } from './apps/orbit-stepper'
import { StepProfile } from './apps/step-profile'
import { StepTopics } from './apps/step-topics'
import { StepReview } from './apps/step-review'
import { StepWaiting } from './apps/step-waiting'
import { profileValid as isProfileValid, type ProfileDraft, type TopicDraft } from './apps/wizard-types'

const steps = ['Hồ sơ app', 'Topic đầu tiên', 'Rà soát', 'Chờ duyệt']

/** UC-001 §B — wizard 4 bước; state ở đây, từng bước ở components/apps/step-*.tsx. */
export function AppRegistrationWizard() {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<ProfileDraft>({
    appSlug: 'ews-atlas',
    external: false,
    namespace: 'atlas',
    channels: ['in_app', 'email'],
    origins: ['https://atlas.enterprise.vn'],
    ipAllowlist: [],
  })
  const [topics, setTopics] = useState<TopicDraft[]>([
    {
      suffix: 'data_quality',
      name: 'Chất lượng dữ liệu',
      description: 'Cảnh báo dataset lệch schema.',
      channels: ['in_app'],
      severity: 'warning',
      userMutable: true,
    },
  ])
  const profileValid = isProfileValid(profile)
  const next = () => {
    if (step === 0 && !profileValid) return
    if (step === 1 && topics.length === 0) return
    setStep((v) => Math.min(3, v + 1))
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
          {step === 0 && <StepProfile draft={profile} onChange={setProfile} />}
          {step === 1 && (
            <StepTopics
              namespace={profile.namespace}
              declaredChannels={profile.channels}
              topics={topics}
              onChange={setTopics}
            />
          )}
          {step === 2 && <StepReview profile={profile} topics={topics} onSubmit={() => setStep(3)} />}
          {step === 3 && <StepWaiting />}
          {step < 2 && (
            <div className="mt-7 flex justify-between border-t border-[var(--orbit)] pt-5">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((v) => v - 1)}>
                  <ChevronLeft /> Quay lại
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={next} disabled={step === 0 ? !profileValid : topics.length === 0}>
                Tiếp tục <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          )}
          {step === 2 && (
            <div className="mt-7 border-t border-[var(--orbit)] pt-5">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft /> Quay lại
              </Button>
            </div>
          )}
        </Panel>
      </motion.div>
    </div>
  )
}
