import { Suspense } from 'react'
import RegisterForm from './RegisterForm'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-8 bg-muted rounded w-3/4 mx-auto" /><div className="h-10 bg-muted rounded" /><div className="h-10 bg-muted rounded" /><div className="h-10 bg-muted rounded" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
