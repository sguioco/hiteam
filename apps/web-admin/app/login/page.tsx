import { AuthPanel } from "@/components/auth-panel"
import { BackToHomeLink } from "@/components/back-to-home-link"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <BackToHomeLink />
      <AuthPanel />
    </div>
  )
}
