'use client'

import { useState } from 'react'
import { XCircle, User, Phone, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CpfPhoneModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { cpf: string; phone: string }) => void
  initialCpf?: string
  initialPhone?: string
}

export default function CpfPhoneModal({
  isOpen,
  onClose,
  onSubmit,
  initialCpf = '',
  initialPhone = ''
}: CpfPhoneModalProps) {
  const [cpf, setCpf] = useState(initialCpf)
  const [phone, setPhone] = useState(initialPhone)
  const [errors, setErrors] = useState<{ cpf?: string; phone?: string }>({})

  // Máscara de CPF: 000.000.000-00
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return value
  }

  // Máscara de telefone: (00) 00000-0000
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }
    return value
  }

  // Validar CPF
  const validateCpf = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, '')
    
    if (numbers.length !== 11) {
      setErrors(prev => ({ ...prev, cpf: 'CPF deve ter 11 dígitos' }))
      return false
    }

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(numbers)) {
      setErrors(prev => ({ ...prev, cpf: 'CPF inválido' }))
      return false
    }

    // Validar dígitos verificadores
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers.charAt(i)) * (10 - i)
    }
    let digit = 11 - (sum % 11)
    if (digit >= 10) digit = 0
    if (digit !== parseInt(numbers.charAt(9))) {
      setErrors(prev => ({ ...prev, cpf: 'CPF inválido' }))
      return false
    }

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers.charAt(i)) * (11 - i)
    }
    digit = 11 - (sum % 11)
    if (digit >= 10) digit = 0
    if (digit !== parseInt(numbers.charAt(10))) {
      setErrors(prev => ({ ...prev, cpf: 'CPF inválido' }))
      return false
    }

    setErrors(prev => ({ ...prev, cpf: undefined }))
    return true
  }

  // Validar telefone
  const validatePhone = (phone: string): boolean => {
    const numbers = phone.replace(/\D/g, '')
    
    if (numbers.length < 10 || numbers.length > 11) {
      setErrors(prev => ({ ...prev, phone: 'Telefone deve ter 10 ou 11 dígitos' }))
      return false
    }

    // Validar DDD (código de área)
    const ddd = parseInt(numbers.substring(0, 2))
    const validDDDs = [
      11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
      21, 22, 24, // RJ
      27, 28, // ES
      31, 32, 33, 34, 35, 37, 38, // MG
      41, 42, 43, 44, 45, 46, // PR
      47, 48, 49, // SC
      51, 53, 54, 55, // RS
      61, // DF
      62, 64, // GO
      63, // TO
      65, 66, // MT
      67, // MS
      68, // AC
      69, // RO
      71, 73, 74, 75, 77, // BA
      79, // SE
      81, 87, // PE
      82, // AL
      83, // PB
      84, // RN
      85, 88, // CE
      86, 89, // PI
      91, 93, 94, // PA
      92, 97, // AM
      95, // RR
      96, // AP
      98, 99, // MA
    ]

    if (!validDDDs.includes(ddd)) {
      setErrors(prev => ({ ...prev, phone: 'DDD inválido' }))
      return false
    }

    // Se tiver 11 dígitos, deve começar com 9
    if (numbers.length === 11 && numbers.charAt(2) !== '9') {
      setErrors(prev => ({ ...prev, phone: 'Celular deve começar com 9' }))
      return false
    }

    setErrors(prev => ({ ...prev, phone: undefined }))
    return true
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value)
    setCpf(formatted)
    if (errors.cpf) {
      setErrors(prev => ({ ...prev, cpf: undefined }))
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }))
    }
  }

  const handleSubmit = () => {
    const isCpfValid = validateCpf(cpf)
    const isPhoneValid = validatePhone(phone)

    if (!isCpfValid || !isPhoneValid) {
      toast.error('Por favor, corrija os erros antes de continuar')
      return
    }

    // Remover formatação antes de enviar
    const cleanCpf = cpf.replace(/\D/g, '')
    const cleanPhone = phone.replace(/\D/g, '')

    onSubmit({ cpf: cleanCpf, phone: cleanPhone })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center relative rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
          
          <div className="flex items-center justify-center mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Dados Adicionais</h3>
          </div>
          <p className="text-blue-100 text-sm">
            Precisamos de algumas informações para processar seu pagamento
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Para gerar o PIX, precisamos do seu CPF e telefone no padrão brasileiro (DDD + número)
            </p>
          </div>

          {/* CPF Input */}
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
              CPF *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="cpf"
                value={cpf}
                onChange={handleCpfChange}
                onBlur={() => cpf && validateCpf(cpf)}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`block w-full pl-10 pr-3 py-2 border ${
                  errors.cpf ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            {errors.cpf && (
              <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
            )}
          </div>

          {/* Phone Input */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Telefone/Celular *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => phone && validatePhone(phone)}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className={`block w-full pl-10 pr-3 py-2 border ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all font-medium"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}




