import { PageHeader } from '@/components/page-header'
import { AppRegistrationWizard } from '@/components/app-registration-wizard'
export default function Page() {
  return (
    <>
      <PageHeader
        title="Đăng ký App Service"
        subtitle="Tạo publisher mới cho EWS Notification Service"
      />
      <AppRegistrationWizard />
    </>
  )
}
