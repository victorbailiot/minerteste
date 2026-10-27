'use client'

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect } from 'react'

interface Permission {
  id: string
  key: string
  resource: string
  action: string
  description: string
}

interface Role {
  id: string
  name: string
  description: string
  isSystemRole: boolean
}

interface UserPermissionsResponse {
  success: boolean
  data: {
    roles: Role[]
    permissions: {
      all: Permission[]
      grouped: Record<string, Permission[]>
      keys: string[]
    }
    individualPermissions: {
      granted: Array<{
        id: string
        key: string
        description: string
        grantedAt: string
        expiresAt?: string
      }>
      revoked: Array<{
        id: string
        key: string
        description: string
        grantedAt: string
        expiresAt?: string
      }>
    }
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Erro ao buscar permissões')
  }
  return res.json()
}

/**
 * Hook para acessar permissões do usuário autenticado
 */
export function usePermissions() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  
  // Usar userId na chave para garantir cache separado por usuário
  // Isso faz com que diferentes usuários tenham cache separado automaticamente
  const userId = session?.user?.id
  const cacheKey = userId && isAuthenticated 
    ? `/api/auth/me/permissions?userId=${userId}` 
    : null

  const { data, error, mutate, isLoading } = useSWR<UserPermissionsResponse>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minuto
      // Quando a chave muda (userId muda), o SWR automaticamente busca novos dados
      // Mas garantimos que dados antigos não sejam usados ao limpar quando não autenticado
    }
  )

  // Limpar dados quando o usuário não está autenticado
  useEffect(() => {
    if (!isAuthenticated && data) {
      // Limpar cache quando não está autenticado
      mutate(undefined, { revalidate: false })
    }
  }, [isAuthenticated, data, mutate])

  // Debug log (remover em produção)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 usePermissions debug:', {
      isAuthenticated,
      userId,
      cacheKey,
      isLoading,
      error,
      data: data ? {
        roles: data.data?.roles?.map(r => r.name) || [],
        permissions: data.data?.permissions?.keys?.length || 0
      } : null,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Verificar se tem uma permissão específica
   */
  const hasPermission = (permissionKey: string): boolean => {
    if (!data?.data?.permissions?.keys) return false
    return data.data.permissions.keys.includes(permissionKey)
  }

  /**
   * Verificar se tem todas as permissões (AND)
   */
  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    if (!data?.data?.permissions?.keys) return false
    return permissionKeys.every(key => data.data.permissions.keys.includes(key))
  }

  /**
   * Verificar se tem pelo menos uma permissão (OR)
   */
  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    if (!data?.data?.permissions?.keys) return false
    return permissionKeys.some(key => data.data.permissions.keys.includes(key))
  }

  /**
   * Verificar se tem um role específico
   */
  const hasRole = useCallback((roleName: string): boolean => {
    // Se não há dados, retorna false (dados não carregados ou usuário sem roles)
    if (!data?.data?.roles) return false
    // Se array está vazio, usuário não tem roles
    if (data.data.roles.length === 0) return false
    return data.data.roles.some(role => role.name === roleName)
  }, [data?.data?.roles])

  /**
   * Verificar se tem algum dos roles
   */
  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    // Se não há dados, retorna false (dados não carregados ou usuário sem roles)
    if (!data?.data?.roles) return false
    // Se array está vazio, usuário não tem roles
    if (data.data.roles.length === 0) return false
    
    const result = roleNames.some(roleName => 
      data.data.roles.some(role => role.name === roleName)
    )
    
    // Debug log (remover em produção)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 hasAnyRole debug:', {
        roleNames,
        roles: data.data.roles.map(r => r.name),
        result,
        isLoading,
        hasData: !!data?.data?.roles,
        rolesLength: data.data.roles.length,
        dataExists: !!data,
        timestamp: new Date().toISOString()
      })
    }
    
    return result
  }, [data?.data?.roles, isLoading, data])

  /**
   * Verificar se é SUPER_ADMIN
   */
  const isSuperAdmin = useCallback((): boolean => {
    return hasRole('SUPER_ADMIN')
  }, [hasRole])

  return {
    // Dados
    roles: data?.data?.roles || [],
    permissions: data?.data?.permissions?.all || [],
    permissionKeys: data?.data?.permissions?.keys || [],
    groupedPermissions: data?.data?.permissions?.grouped || {},
    individualPermissions: data?.data?.individualPermissions || { granted: [], revoked: [] },

    // Estados
    loading: isLoading || status === 'loading',
    error,

    // Funções de verificação
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    can: hasPermission, // Alias mais intuitivo

    // Utilitários
    refresh: mutate,
  }
}

/**
 * Hook para requerer uma permissão (redireciona se não tiver)
 */
export function useRequirePermission(permissionKey: string) {
  const { hasPermission, loading } = usePermissions()
  const { status } = useSession()

  if (status === 'loading' || loading) {
    return { loading: true, hasAccess: false }
  }

  const hasAccess = hasPermission(permissionKey)

  if (!hasAccess && status === 'authenticated') {
    // Usuário autenticado mas sem permissão
    return { loading: false, hasAccess: false, forbidden: true }
  }

  return { loading: false, hasAccess, forbidden: false }
}

/**
 * Hook para requerer um role (redireciona se não tiver)
 */
export function useRequireRole(roleName: string) {
  const { hasRole, loading } = usePermissions()
  const { status } = useSession()

  if (status === 'loading' || loading) {
    return { loading: true, hasAccess: false }
  }

  const hasAccess = hasRole(roleName)

  if (!hasAccess && status === 'authenticated') {
    // Usuário autenticado mas sem role
    return { loading: false, hasAccess: false, forbidden: true }
  }

  return { loading: false, hasAccess, forbidden: false }
}

