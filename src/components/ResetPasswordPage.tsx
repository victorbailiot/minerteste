'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

function ResetPasswordPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    setToken(tokenParam)

    if (!tokenParam) {
      setTokenValid(false)
      toast.error('Token de recuperação não fornecido')
    } else {
      setTokenValid(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (!token) {
      toast.error('Token de recuperação inválido')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Senha alterada com sucesso!')
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else {
        toast.error(data.error || 'Erro ao alterar senha')
      }
    } catch (error) {
      toast.error('Erro interno do servidor')
    } finally {
      setLoading(false)
    }
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex">
        {/* Lado esquerdo - 60% da tela */}
        <div className="hidden lg:flex lg:w-3/5 relative bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
          {/* Imagem de fundo */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 opacity-80"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')`
            }}
          />
          
          {/* Overlay gradiente para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 via-purple-900/40 to-transparent z-10"></div>
          
          {/* Conteúdo centralizado */}
          <div className="relative z-20 flex flex-col items-center justify-center w-full px-12 text-white">
            <div className="text-center max-w-md">
              <h1 className="text-4xl font-bold mb-6">
                Link Inválido
              </h1>
              <p className="text-xl mb-8 text-gray-100">
                O link de recuperação é inválido ou expirou. Solicite um novo link.
              </p>
              <div className="space-y-4">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
                >
                  Solicitar Novo Link
                </Link>
                <div>
                  <Link
                    href="/auth/login"
                    className="text-white hover:text-gray-200 font-medium"
                  >
                    Voltar para o login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lado direito - 40% da tela */}
        <div className="w-full lg:w-2/5 bg-white flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Link Inválido
              </h2>
              <p className="text-gray-600">
                O link de recuperação é inválido ou expirou.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Token inválido
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      O link de recuperação fornecido é inválido ou expirou. 
                      Solicite um novo link de recuperação.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                href="/auth/forgot-password"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Solicitar Novo Link
              </Link>
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Voltar para o login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo - 60% da tela */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        {/* Imagem de fundo */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 opacity-80"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')`
          }}
        />
        
        {/* Overlay gradiente para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 via-purple-900/40 to-transparent z-10"></div>
        
        {/* Conteúdo centralizado */}
        <div className="relative z-20 flex flex-col items-center justify-center w-full px-12 text-white">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-6">
              Redefinir Senha
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              Digite sua nova senha para recuperar o acesso à sua conta.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-gray-100">Senha segura e protegida</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-gray-100">Acesso imediato à conta</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span className="text-gray-100">Processo simples e rápido</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - 40% da tela */}
      <div className="w-full lg:w-2/5 bg-white flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Redefinir Senha
            </h2>
            <p className="text-gray-600">
              Digite sua nova senha para recuperar o acesso à sua conta.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo de 6 caracteres
                </p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500 text-sm"
              >
                Voltar para o login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <ResetPasswordPageContent />
    </Suspense>
  )
} 