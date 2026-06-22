import 'server-only'
import { betterAuth } from 'better-auth'
import type { BaseURLConfig } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { cache } from 'react'
import { cookies } from 'next/headers'
import db from '@/lib/db'
import {
  usersTable,
  sessionsTable,
  accountsTable,
  verificationsTable,
} from '@/lib/db/schemas'

const authFallbackURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
const configuredAllowedHosts = process.env.BETTER_AUTH_ALLOWED_HOSTS
  ?.split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const authBaseURL: BaseURLConfig = configuredAllowedHosts?.length
  ? {
      allowedHosts: configuredAllowedHosts,
      fallback: authFallbackURL,
      protocol: process.env.NODE_ENV === 'development' ? 'auto' : 'https',
    }
  : process.env.NODE_ENV === 'production'
    ? authFallbackURL
    : {
        allowedHosts: ['*'],
        fallback: authFallbackURL,
        protocol: 'auto',
      }

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: usersTable,
      session: sessionsTable,
      account: accountsTable,
      verification: verificationsTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: authBaseURL,
})

export const getSession = cache(async () => {
  const cookieStore = await cookies()
  return auth.api.getSession({
    headers: new Headers({ cookie: cookieStore.toString() }),
  })
})
