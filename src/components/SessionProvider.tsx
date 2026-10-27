'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
}

export default function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      refetchInterval={0} // Desabilita refetch automático
      refetchOnWindowFocus={false} // Desabilita refetch quando a aba ganha foco
    >
      {children}
    </NextAuthSessionProvider>
  )
} 