import { Suspense } from 'react'
import OnboardingForm from './OnboardingForm'

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-8 bg-muted rounded w-1/2 mx-auto" /><div className="h-10 bg-muted rounded" /><div className="h-10 bg-muted rounded" /></div>}>
      <OnboardingForm />
    </Suspense>
  )
}
