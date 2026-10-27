'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { z } from 'zod'
import { CountrySelector } from '@/components/international/CountrySelector'
import { PhoneInput } from '@/components/international/PhoneInput'
import { DocumentInput } from '@/components/international/DocumentInput'
import { DocumentType } from '@/generated/prisma'
import type { Country } from '@/lib/international-utils'

// Schema de validação para edição do perfil
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().email('Email inválido')
})

type ProfileFormData = z.infer<typeof profileSchema>

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: ''
  })
  
  // Campos internacionais
  const [country, setCountry] = useState('BR')
  const [documentType, setDocumentType] = useState<DocumentType | ''>(DocumentType.CPF)
  const [documentNumber, setDocumentNumber] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+55')
  const [phoneNumber, setPhoneNumber] = useState('')
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Carregar dados do usuário quando disponível
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        email: user.email || ''
      })
      
      // Carregar campos internacionais
      setCountry(user.country || 'BR')
      setDocumentType((user.documentType as DocumentType) || DocumentType.CPF)
      setDocumentNumber(user.documentNumber || user.cpf || '')
      setPhoneCountryCode(user.phoneCountryCode || '+55')
      setPhoneNumber(user.phoneNumber || user.phone?.replace(/\D/g, '') || '')
    }
  }, [user, isOpen])
  
  const handleCountryChange = (selectedCountry: Country) => {
    setCountry(selectedCountry.code)
    setPhoneCountryCode(selectedCountry.phoneCode)
    // Resetar documento quando mudar de país
    setDocumentType('')
    setDocumentNumber('')
  }

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    try {
      profileSchema.parse(formData)
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

    const requestData = {
      name: formData.name,
      email: formData.email,
      country,
      documentType,
      documentNumber: documentNumber.replace(/\D/g, ''),
      phoneCountryCode,
      phoneNumber: phoneNumber.replace(/\D/g, '')
    }

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar perfil')
      }

      setSuccessMessage('Perfil atualizado com sucesso!')
      
      setTimeout(() => {
        onClose()
        setSuccessMessage('')
        window.location.reload()
      }, 2000)

    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Erro interno do servidor' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: ''
    })
    setCountry('BR')
    setDocumentType(DocumentType.CPF)
    setDocumentNumber('')
    setPhoneCountryCode('+55')
    setPhoneNumber('')
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
            Editar Dados do Perfil
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Seu nome completo"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="seu@email.com"
                disabled={true}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

          </div>

          {/* Campos Internacionais */}
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Informações Internacionais
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seletor de País */}
              <div className="md:col-span-2">
                <CountrySelector
                  value={country}
                  onChange={handleCountryChange}
                  disabled={isSubmitting}
                  variant="light"
                />
              </div>

              {/* Input de Documento */}
              <div className="md:col-span-2">
                <DocumentInput
                  country={country}
                  documentType={documentType}
                  documentNumber={documentNumber}
                  onChange={(type, number) => {
                    setDocumentType(type)
                    setDocumentNumber(number)
                  }}
                  disabled={true}
                  variant="light"
                />
                <p className="mt-1 text-xs text-gray-500">
                  O documento não pode ser alterado após o cadastro. Entre em contato com o suporte se necessário.
                </p>
              </div>

              {/* Input de Telefone */}
              <div className="md:col-span-2">
                <PhoneInput
                  countryCode={phoneCountryCode}
                  phoneNumber={phoneNumber}
                  country={country}
                  onChange={(code, number) => {
                    setPhoneCountryCode(code)
                    setPhoneNumber(number)
                  }}
                  disabled={isSubmitting}
                  variant="light"
                />
              </div>
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
          <div className="flex justify-end space-x-3 pt-4">
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
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 