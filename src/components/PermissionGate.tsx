'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface PermissionGateProps {
  permission: string | string[]
  requireAll?: boolean // Se true, precisa ter todas as permissões (AND). Se false, precisa ter pelo menos uma (OR)
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Componente para proteger conteúdo baseado em permissões
 */
export function PermissionGate({
  permission,
  requireAll = true,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, loading } = usePermissions()

  // Mostrar loading enquanto carrega
  if (loading) {
    return <>{fallback}</>
  }

  // Verificar permissão
  let hasAccess = false

  if (typeof permission === 'string') {
    hasAccess = hasPermission(permission)
  } else if (Array.isArray(permission)) {
    hasAccess = requireAll 
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
  }

  // Renderizar conteúdo ou fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>
}

