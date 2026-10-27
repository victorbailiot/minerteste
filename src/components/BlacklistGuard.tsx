'use client'

import React from 'react'
import { useBlacklist } from '@/lib/hooks/useBlacklist'

interface BlacklistGuardProps {
  resource: string
  action?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const BlacklistGuard: React.FC<BlacklistGuardProps> = ({
  resource,
  action,
  fallback = null,
  children
}) => {
  const { isBlacklisted, isLoading } = useBlacklist()

  if (isLoading) {
    return null
  }

  const blocked = isBlacklisted(resource, action)

  if (blocked) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
