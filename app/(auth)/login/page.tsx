import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-8 bg-muted rounded w-3/4 mx-auto" /><div className="h-10 bg-muted rounded" /><div className="h-10 bg-muted rounded" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
