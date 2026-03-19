"use client"

import { AuthPanel } from "@/components/auth-panel"

export default function SignupPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <AuthPanel initialMode="signup" />
    </div>
  )
}
