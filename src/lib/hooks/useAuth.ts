'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useMemo } from 'react'
import { usePermissions } from './usePermissions'

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const { hasAnyRole, isSuperAdmin, loading: permissionsLoading, refresh: refreshPermissions } = usePermissions()

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'
  
  // Debug log (remover em produção)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 useAuth session debug:', {
      status,
      isAuthenticated,
      permissionsLoading,
      userId: session?.user?.id,
      user: session?.user?.email,
      sessionExists: !!session
    })
  }
  
  // Verificar se é admin usando o sistema de roles e permissões
  const isAdmin = useMemo(() => {
    if (!isAuthenticated) return false
    
    // Verificar permissões - as funções hasAnyRole e isSuperAdmin já lidam com loading
    const hasAdminRole = hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])
    const isSuper = isSuperAdmin()
    const result = hasAdminRole || isSuper
    
    // Debug log (remover em produção)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 useAuth isAdmin debug:', {
        isAuthenticated,
        status,
        permissionsLoading,
        hasAdminRole,
        isSuper,
        result,
        user: session?.user?.email,
        timestamp: new Date().toISOString()
      })
    }
    
    return result
  }, [isAuthenticated, status, permissionsLoading, hasAnyRole, isSuperAdmin, session?.user?.email])

  const logout = async () => {
    try {
      // Limpar cache de permissões antes do logout
      refreshPermissions(undefined, { revalidate: false })
      
      await signOut({ redirect: false })
      toast.success('Logout realizado com sucesso!')
      router.push('/auth/login')
    } catch (error) {
      console.error('Erro no logout:', error)
      toast.error('Erro ao fazer logout')
    }
  }

  const requireAuth = () => {
    if (!isAuthenticated && !isLoading) {
      router.push('/auth/login')
      return false
    }
    return true
  }

  const requireAdmin = () => {
    if (!requireAuth()) return false
    if (!isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta área.')
      router.push('/dashboard')
      return false
    }
    return true
  }

  return {
    session,
    user: session?.user,
    isAuthenticated,
    isLoading,
    isAdmin,
    logout,
    requireAuth,
    requireAdmin,
    update
  }
} 