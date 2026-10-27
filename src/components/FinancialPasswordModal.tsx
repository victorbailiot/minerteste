'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { toast } from 'sonner'
import Modal from './ui/modal'
import { Button } from './ui/button'
import { Eye, EyeOff, Lock } from 'lucide-react'

// Schema de validação para senha financeira
const financialPasswordSchema = z.object({
  password: z.string().min(4, 'Senha financeira deve ter pelo menos 4 caracteres').max(20, 'Senha financeira deve ter no máximo 20 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
})

type FinancialPasswordFormData = z.infer<typeof financialPasswordSchema>

interface FinancialPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onPasswordVerified?: (password: string) => void
  mode?: 'create' | 'update' | 'verify'
  onVerify?: (password: string) => Promise<boolean>
  title?: string
  description?: string
}

export default function FinancialPasswordModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  onPasswordVerified,
  mode = 'create',
  onVerify,
  title,
  description
}: FinancialPasswordModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<FinancialPasswordFormData>({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [hasFinancialPassword, setHasFinancialPassword] = useState<boolean | null>(null)

  // Verificar se usuário já tem senha financeira
  useEffect(() => {
    if (isOpen && mode === 'create') {
      checkFinancialPassword()
    }
  }, [isOpen, mode])

  const checkFinancialPassword = async () => {
    try {
      const response = await fetch('/api/auth/financial-password/check')
      if (response.ok) {
        const data = await response.json()
        setHasFinancialPassword(data.hasFinancialPassword)
      }
    } catch (error) {
      console.error('Erro ao verificar senha financeira:', error)
    }
  }

  const handleInputChange = (field: keyof FinancialPasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro do campo quando o usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    try {
      if (mode === 'verify') {
        if (!currentPassword) {
          setErrors({ currentPassword: 'Senha financeira é obrigatória' })
          return false
        }
        return true
      }
      
      financialPasswordSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      if (mode === 'verify') {
        if (onVerify) {
          const isValid = await onVerify(currentPassword)
          if (isValid) {
            toast.success('Senha financeira confirmada!')
            // Passar senha para o callback antes de fechar
            if (onPasswordVerified) {
              onPasswordVerified(currentPassword)
            }
            onClose()
            if (onSuccess) {
              onSuccess()
            }
          } else {
            setErrors({ currentPassword: 'Senha financeira incorreta' })
          }
        } else {
          // Validação via API
          const response = await fetch('/api/auth/financial-password/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: currentPassword })
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao verificar senha financeira')
          }

          if (data.valid) {
            toast.success('Senha financeira confirmada!')
            // Passar senha para o callback antes de fechar
            if (onPasswordVerified) {
              onPasswordVerified(currentPassword)
            }
            onClose()
            if (onSuccess) {
              onSuccess()
            }
          } else {
            setErrors({ currentPassword: 'Senha financeira incorreta' })
          }
        }
      } else {
        // Criar ou atualizar senha financeira
        const endpoint = mode === 'update' 
          ? '/api/auth/financial-password/update'
          : '/api/auth/financial-password/create'
        
        const response = await fetch(endpoint, {
          method: mode === 'update' ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            password: formData.password,
            currentPassword: mode === 'update' ? currentPassword : undefined
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao salvar senha financeira')
        }

        toast.success(mode === 'update' ? 'Senha financeira atualizada com sucesso!' : 'Senha financeira criada com sucesso!')
        
        // Limpar formulário
        setFormData({
          password: '',
          confirmPassword: ''
        })
        setCurrentPassword('')
        
        // Fechar modal após 1 segundo
        setTimeout(() => {
          onClose()
          if (onSuccess) {
            onSuccess()
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Erro ao processar senha financeira:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Erro interno do servidor' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Limpar formulário e erros ao fechar
    setFormData({
      password: '',
      confirmPassword: ''
    })
    setCurrentPassword('')
    setErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowCurrentPassword(false)
    onClose()
  }

  if (!isOpen) return null

  // Determinar título e descrição baseado no modo
  const modalTitle = title || (mode === 'verify' 
    ? 'Confirmar Senha Financeira'
    : mode === 'update'
    ? 'Atualizar Senha Financeira'
    : 'Criar Senha Financeira')
  
  const modalDescription = description || (mode === 'verify'
    ? 'Digite sua senha financeira para confirmar esta operação'
    : mode === 'update'
    ? 'Digite sua senha atual e a nova senha financeira'
    : 'Crie uma senha financeira para proteger suas operações financeiras')

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      maxWidth="max-w-md"
      footerButtons={
        <div className="flex gap-3 w-full">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="financial-password-form"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processando...
              </>
            ) : (
              mode === 'verify' ? 'Confirmar' : mode === 'update' ? 'Atualizar' : 'Criar'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Descrição */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {modalDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form id="financial-password-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Senha Atual (apenas para atualização) */}
          {mode === 'update' && (
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Senha Financeira Atual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite sua senha financeira atual"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
              )}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    router.push('/auth/forgot-financial-password')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Esqueceu a Senha Financeira?
                </button>
              </div>
            </div>
          )}

          {/* Senha Financeira (verificação) */}
          {mode === 'verify' && (
            <div>
              <label htmlFor="verifyPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Senha Financeira
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="verifyPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite sua senha financeira"
                  disabled={isSubmitting}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
              )}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    router.push('/auth/forgot-financial-password')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Esqueceu a Senha Financeira?
                </button>
              </div>
            </div>
          )}

          {/* Nova Senha Financeira (criar/atualizar) */}
          {mode !== 'verify' && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'update' ? 'Nova Senha Financeira' : 'Senha Financeira'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Mínimo 4 caracteres"
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirmar Senha Financeira */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha Financeira
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirme a senha financeira"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          {/* Mensagens de Erro */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </form>
      </div>
    </Modal>
  )
}



