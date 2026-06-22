'use server'
import { redirect } from 'next/navigation'
import { auth, getSession } from '@/lib/auth/server'
import { headers } from 'next/headers'

export async function logoutAction() {
  const session = await getSession()
  if (session) {
    const headerStore = await headers()
    await auth.api.signOut({ headers: headerStore })
  }
  redirect('/login')
}
