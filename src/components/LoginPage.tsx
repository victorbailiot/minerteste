'use client'

import { useState, Suspense } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'

function LoginPageContent() {
  const [formData, setFormData] = useState({
    emailOrReferralCode: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        emailOrReferralCode: formData.emailOrReferralCode,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      if (result?.ok) {
        toast.success('Login realizado com sucesso!')
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      console.error('Erro no login:', error)
      toast.error('Erro interno do servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Função para detectar se é email ou código de indicação
  const isEmail = (value: string) => {
    return value.includes('@') && value.includes('.')
  }

  const getInputType = () => {
    return isEmail(formData.emailOrReferralCode) ? 'email' : 'text'
  }

  const getPlaceholder = () => {
    return isEmail(formData.emailOrReferralCode) 
      ? 'Digite seu email ou código de indicação' 
      : 'Digite seu código de indicação ou email'
  }

  const getLabel = () => {
    return isEmail(formData.emailOrReferralCode) 
      ? 'Email' 
      : 'Código de Indicação'
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
              Bem-vindo de volta!
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              Acesse sua conta e continue sua jornada de sucesso na nossa plataforma de mineração.
            </p>
          </div>
        </div>
      </div>

      {/* Lado direito - 40% da tela */}
      <div className="w-full lg:w-2/5 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Título para mobile */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Entrar na sua conta
            </h2>
          </div>

          {/* Título para desktop */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Entrar na sua conta
            </h2>
            <p className="text-sm text-gray-600">
              Ou{' '}
              <Link
                href="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                criar uma nova conta
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="emailOrReferralCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Email/Código
                </label>
                <input
                  id="emailOrReferralCode"
                  name="emailOrReferralCode"
                  type={getInputType()}
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Digite seu email ou código de indicação"
                  value={formData.emailOrReferralCode}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Digite seu email ou código de indicação
                </p>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Digite sua senha"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setShowPassword(prev => !prev)
                    }}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500 text-sm"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            {/* Link para registro no mobile */}
            <div className="lg:hidden text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link
                  href="/auth/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Criar conta
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
} 