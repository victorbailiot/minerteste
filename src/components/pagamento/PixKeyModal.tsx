'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { z } from 'zod'

// Schema de validação para chave PIX
const pixKeySchema = z.object({
  pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
  pixKey: z.string().min(1, 'Chave PIX é obrigatória'),
  accountHolderName: z.string().min(2, 'Nome do titular deve ter pelo menos 2 caracteres'),
  bankName: z.string().min(2, 'Nome do banco é obrigatório')
})

type PixKeyFormData = z.infer<typeof pixKeySchema>

interface PixKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function PixKeyModal({ isOpen, onClose, onSuccess }: PixKeyModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<PixKeyFormData>({
    pixKeyType: 'CPF',
    pixKey: '',
    accountHolderName: '',
    bankName: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [currentPixKey, setCurrentPixKey] = useState<any>(null)

  // Carregar dados do usuário quando disponível
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        pixKeyType: 'CPF',
        pixKey: '',
        accountHolderName: user.name || '',
        bankName: ''
      })
      loadCurrentPixKey()
    }
  }, [user, isOpen])

  const loadCurrentPixKey = async () => {
    try {
      const response = await fetch('/api/auth/pix-key')
      if (response.ok) {
        const data = await response.json()
        setCurrentPixKey(data.pixKey)
      }
    } catch (error) {
      console.error('Erro ao carregar chave PIX:', error)
    }
  }

  // Função para aplicar máscara conforme o tipo de chave
  const applyMask = (value: string, type: string): string => {
    const numbers = value.replace(/\D/g, '')
    
    switch (type) {
      case 'CPF':
        return numbers
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
          .slice(0, 14)
      
      case 'CNPJ':
        return numbers
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
          .slice(0, 18)
      
      case 'PHONE':
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{5})(\d)/, '$1-$2')
          .slice(0, 15)
      
      case 'EMAIL':
      case 'RANDOM':
      default:
        return value
    }
  }

  // Função para obter placeholder conforme o tipo
  const getPlaceholder = (type: string): string => {
    switch (type) {
      case 'CPF':
        return '000.000.000-00'
      case 'CNPJ':
        return '00.000.000/0000-00'
      case 'EMAIL':
        return 'seu@email.com'
      case 'PHONE':
        return '(11) 99999-9999'
      case 'RANDOM':
        return 'Chave aleatória'
      default:
        return ''
    }
  }

  const handleInputChange = (field: keyof PixKeyFormData, value: string) => {
    let processedValue = value
    
    // Aplicar máscara apenas para o campo pixKey
    if (field === 'pixKey') {
      processedValue = applyMask(value, formData.pixKeyType)
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }))
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Atualizar máscara quando o tipo de chave mudar
  const handlePixKeyTypeChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      pixKeyType: value as any,
      pixKey: '' // Limpar o campo quando mudar o tipo
    }))
    
    if (errors.pixKeyType) {
      setErrors(prev => ({ ...prev, pixKeyType: '' }))
    }
  }

  const validatePixKey = (type: string, key: string): boolean => {
    const cleanKey = key.replace(/\D/g, '')
    
    switch (type) {
      case 'CPF':
        return /^\d{11}$/.test(cleanKey)
      case 'CNPJ':
        return /^\d{14}$/.test(cleanKey)
      case 'EMAIL':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
      case 'PHONE':
        return /^\d{10,11}$/.test(cleanKey)
      case 'RANDOM':
        return key.length >= 32
      default:
        return false
    }
  }

  const validateForm = (): boolean => {
    try {
      pixKeySchema.parse(formData)
      
      // Validação específica da chave PIX
      if (!validatePixKey(formData.pixKeyType, formData.pixKey)) {
        setErrors(prev => ({ 
          ...prev, 
          pixKey: `Chave PIX inválida para o tipo ${formData.pixKeyType}` 
        }))
        return false
      }
      
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
    setSuccessMessage('')
    setErrors({})

    try {
      const response = await fetch('/api/auth/pix-key', {
        method: currentPixKey ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao salvar chave PIX')
      }

      setSuccessMessage(currentPixKey ? 'Chave PIX atualizada com sucesso!' : 'Chave PIX cadastrada com sucesso!')
      
      // Chamar callback de sucesso se fornecido
      if (onSuccess) {
        onSuccess()
      }
      
      setTimeout(() => {
        onClose()
        setSuccessMessage('')
        loadCurrentPixKey()
      }, 2000)

    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Erro interno do servidor' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!currentPixKey) return

    if (!confirm('Tem certeza que deseja excluir sua chave PIX?')) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/pix-key', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir chave PIX')
      }

      setCurrentPixKey(null)
      setSuccessMessage('Chave PIX excluída com sucesso!')
      
      setTimeout(() => {
        onClose()
        setSuccessMessage('')
      }, 2000)

    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Erro interno do servidor' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      pixKeyType: 'CPF',
      pixKey: '',
      accountHolderName: '',
      bankName: ''
    })
    setErrors({})
    setSuccessMessage('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {currentPixKey ? 'Editar Chave PIX' : 'Cadastrar Chave PIX'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chave PIX Atual */}
        {currentPixKey && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Chave PIX Atual</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Tipo:</strong> {currentPixKey.pixKeyType}</p>
              <p><strong>Chave:</strong> {currentPixKey.pixKey}</p>
              <p><strong>Titular:</strong> {currentPixKey.accountHolderName}</p>
              <p><strong>Banco:</strong> {currentPixKey.bankName}</p>
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Chave PIX */}
            <div>
              <label htmlFor="pixKeyType" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Chave PIX
              </label>
              <select
                id="pixKeyType"
                value={formData.pixKeyType}
                onChange={(e) => handlePixKeyTypeChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pixKeyType ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Chave Aleatória</option>
              </select>
              {errors.pixKeyType && (
                <p className="mt-1 text-sm text-red-600">{errors.pixKeyType}</p>
              )}
            </div>

            {/* Chave PIX */}
            <div>
              <label htmlFor="pixKey" className="block text-sm font-medium text-gray-700 mb-2">
                Chave PIX
              </label>
              <input
                type={formData.pixKeyType === 'EMAIL' ? 'email' : 'text'}
                id="pixKey"
                value={formData.pixKey}
                onChange={(e) => handleInputChange('pixKey', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pixKey ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={getPlaceholder(formData.pixKeyType)}
                disabled={isSubmitting}
                maxLength={
                  formData.pixKeyType === 'CPF' ? 14 :
                  formData.pixKeyType === 'CNPJ' ? 18 :
                  formData.pixKeyType === 'PHONE' ? 15 :
                  formData.pixKeyType === 'EMAIL' ? 100 :
                  formData.pixKeyType === 'RANDOM' ? 100 : 100
                }
              />
              {errors.pixKey && (
                <p className="mt-1 text-sm text-red-600">{errors.pixKey}</p>
              )}
            </div>

            {/* Nome do Titular */}
            <div>
              <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Titular
              </label>
              <input
                type="text"
                id="accountHolderName"
                value={formData.accountHolderName}
                onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.accountHolderName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome completo do titular"
                disabled={isSubmitting}
              />
              {errors.accountHolderName && (
                <p className="mt-1 text-sm text-red-600">{errors.accountHolderName}</p>
              )}
            </div>

            {/* Nome do Banco */}
            <div>
              <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Banco
              </label>
              <input
                type="text"
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bankName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Banco do Brasil"
                disabled={isSubmitting}
              />
              {errors.bankName && (
                <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
              )}
            </div>
          </div>

          {/* Mensagens de Erro e Sucesso */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-between pt-4">
            <div>
              {currentPixKey && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Excluir Chave PIX
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : (currentPixKey ? 'Atualizar' : 'Cadastrar')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 