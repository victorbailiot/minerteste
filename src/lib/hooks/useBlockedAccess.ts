'use client'

import { useState } from 'react'

interface UseBlockedAccessReturn {
  isBlocked: boolean
  blockReason: string
  checkAndBlock: (resource: string, action?: string) => Promise<boolean>
  closeModal: () => void
  openModal: (reason: string) => void
}

export function useBlockedAccess(): UseBlockedAccessReturn {
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const checkAndBlock = async (resource: string, action?: string): Promise<boolean> => {
    try {
      // Fazer requisição para verificar blacklist
      const response = await fetch('/api/auth/me/blacklist')
      
      if (!response.ok) {
        return false
      }

      const data = await response.json()
      const entries = data?.data?.entries || []

      if (entries.length === 0) {
        return false
      }

      const now = new Date()

      // Verificar bloqueio específico (resource + action)
      if (action) {
        const specificBlock = entries.find(
          (entry: any) =>
            entry.resource === resource &&
            entry.action === action &&
            (!entry.expiresAt || new Date(entry.expiresAt) > now)
        )

        if (specificBlock) {
          setBlockReason(specificBlock.reason)
          setIsBlocked(true)
          return true
        }
      }

      // Verificar bloqueio geral do recurso (resource sem action)
      const generalBlock = entries.find(
        (entry: any) =>
          entry.resource === resource &&
          entry.action === null &&
          (!entry.expiresAt || new Date(entry.expiresAt) > now)
      )

      if (generalBlock) {
        setBlockReason(generalBlock.reason)
        setIsBlocked(true)
        return true
      }

      return false
    } catch (error) {
      console.error('Erro ao verificar blacklist:', error)
      return false
    }
  }

  const closeModal = () => {
    setIsBlocked(false)
    setBlockReason('')
  }

  const openModal = (reason: string) => {
    setBlockReason(reason)
    setIsBlocked(true)
  }

  return {
    isBlocked,
    blockReason,
    checkAndBlock,
    closeModal,
    openModal
  }
}
