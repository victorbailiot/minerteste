'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ResendConfirmationPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Digite seu email')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      } else {
        toast.error(data.error || 'Erro ao reenviar confirmação')
      }
    } catch (error) {
      toast.error('Erro interno do servidor')
    } finally {
      setLoading(false)
    }
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
              Reenviar Confirmação
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              Não recebeu o email de confirmação? Vamos reenviar para você ativar sua conta.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-gray-100">Processo rápido e seguro</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-gray-100">Link de confirmação válido</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span className="text-gray-100">Ativação imediata da conta</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - 40% da tela */}
      <div className="w-full lg:w-2/5 bg-white flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Título para mobile */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Reenviar Confirmação
            </h2>
          </div>

          {/* Título para desktop */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reenviar Confirmação
            </h2>
            <p className="text-sm text-gray-600">
              Digite seu email para receber um novo link de confirmação
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Digite seu email"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Enviando...' : 'Reenviar Confirmação'}
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