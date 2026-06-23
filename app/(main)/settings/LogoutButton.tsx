'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/app/actions/auth'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await logoutAction()
  }

  return (
    <Button
      variant="destructive"
      className="w-full h-11 border-destructive"
      disabled={loading}
      onClick={handleLogout}
    >
      {loading ? 'Saindo...' : 'Sair da conta'}
    </Button>
  )
}
