'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface BlacklistEntry {
  resource: string
  action: string | null
  reason: string
  expiresAt: Date | null
}

interface UseBlacklistReturn {
  blacklist: BlacklistEntry[]
  isBlacklisted: (resource: string, action?: string) => boolean
  getBlockReason: (resource: string, action?: string) => string | null
  isLoading: boolean
  error: any
  mutate: () => void
}

export function useBlacklist(): UseBlacklistReturn {
  const { data, error, isLoading, mutate } = useSWR('/api/auth/me/blacklist', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000 // 1 minuto
  })

  const blacklist: BlacklistEntry[] = data?.data?.entries || []

  const isBlacklisted = (resource: string, action?: string): boolean => {
    const now = new Date()

    // Verificar bloqueio específico (resource + action)
    if (action) {
      const specificBlock = blacklist.find(
        (entry) =>
          entry.resource === resource &&
          entry.action === action &&
          (!entry.expiresAt || new Date(entry.expiresAt) > now)
      )
      if (specificBlock) return true
    }

    // Verificar bloqueio geral do recurso (resource sem action)
    const generalBlock = blacklist.find(
      (entry) =>
        entry.resource === resource &&
        entry.action === null &&
        (!entry.expiresAt || new Date(entry.expiresAt) > now)
    )

    return !!generalBlock
  }

  const getBlockReason = (resource: string, action?: string): string | null => {
    const now = new Date()

    // Verificar bloqueio específico
    if (action) {
      const specificBlock = blacklist.find(
        (entry) =>
          entry.resource === resource &&
          entry.action === action &&
          (!entry.expiresAt || new Date(entry.expiresAt) > now)
      )
      if (specificBlock) return specificBlock.reason
    }

    // Verificar bloqueio geral
    const generalBlock = blacklist.find(
      (entry) =>
        entry.resource === resource &&
        entry.action === null &&
        (!entry.expiresAt || new Date(entry.expiresAt) > now)
    )

    return generalBlock?.reason || null
  }

  return {
    blacklist,
    isBlacklisted,
    getBlockReason,
    isLoading,
    error,
    mutate
  }
}
