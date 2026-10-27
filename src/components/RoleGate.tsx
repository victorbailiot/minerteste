'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface RoleGateProps {
  role: string | string[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Componente para proteger conteúdo baseado em roles
 */
export function RoleGate({
  role,
  fallback = null,
  children,
}: RoleGateProps) {
  const { hasRole, hasAnyRole, loading } = usePermissions()

  // Mostrar loading enquanto carrega
  if (loading) {
    return <>{fallback}</>
  }

  // Verificar role
  let hasAccess = false

  if (typeof role === 'string') {
    hasAccess = hasRole(role)
  } else if (Array.isArray(role)) {
    hasAccess = hasAnyRole(role)
  }

  // Renderizar conteúdo ou fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>
}

