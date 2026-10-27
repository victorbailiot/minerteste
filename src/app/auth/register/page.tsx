'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CountrySelector } from '@/components/international/CountrySelector'
import { PhoneInput } from '@/components/international/PhoneInput'
import { DocumentInput } from '@/components/international/DocumentInput'
import { DocumentType } from '@/generated/prisma'
import type { Country } from '@/lib/international-utils'
import { normalizeEmail, validateEmailWithDetails } from '@/lib/utils'
import type { SendRegisterSmsCodeResult, VerifyRegisterSmsCodeResult } from '@/model/phone-verification'
import Modal from '@/components/ui/modal'
import TermosDeUsoPage from './termos-de-uso'
import PrivacyPolicyPage from './politica-de-privacidade'

// Imagem de fundo (mesma da landing page)
const BACKGROUND_IMAGE = 'https://images.pexels.com/photos/15138925/pexels-photo-15138925.jpeg'

// Componente de Background com efeitos similares ao HeroSection
const BackgroundLayer = () => {
  const prefersReducedMotion = useReducedMotion()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 1.5 }}
    >
      {/* Gradiente base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-800" />

      {/* Background Image com overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          filter: 'brightness(0.3) contrast(1.2) saturate(1.1)'
        }}
      />

      {/* Gradiente metálico */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-slate-900/60 to-black/70" />

      {/* Efeitos de luz */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-400/8 via-orange-500/4 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-orange-600/6 via-amber-500/3 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/3 via-transparent to-orange-500/3 mix-blend-soft-light pointer-events-none" />

      {/* Mesh gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/10 via-transparent to-orange-600/10" />
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-500/8 via-transparent to-amber-400/8" />
      </div>

      {/* Partículas metálicas animadas */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 opacity-40">
          {[
            { left: '10%', top: '20%', size: 8, delay: 0, color: 'from-amber-400 to-orange-500' },
            { left: '85%', top: '15%', size: 12, delay: 0.5, color: 'from-orange-500 to-amber-400' },
            { left: '25%', top: '60%', size: 6, delay: 1, color: 'from-amber-400 to-orange-600' },
            { left: '75%', top: '70%', size: 10, delay: 1.5, color: 'from-orange-600 to-amber-500' },
            { left: '50%', top: '30%', size: 9, delay: 2, color: 'from-amber-500 to-orange-400' },
            { left: '15%', top: '80%', size: 7, delay: 2.5, color: 'from-orange-400 to-amber-600' },
          ].map((particle, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full bg-gradient-to-br ${particle.color} shadow-lg backdrop-blur-sm`}
              style={{
                left: particle.left,
                top: particle.top,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                zIndex: 10,
                opacity: 0.7 + (i % 3) * 0.1
              }}
              animate={{
                y: [0, -30 - (i % 3) * 8, 0],
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 6 + (i % 3) * 2,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}

      {/* Padrão geométrico */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_#fbbf24_1px,_transparent_1px)] bg-[length:80px_80px]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_#f59e0b_1px,_transparent_1px)] bg-[length:100px_100px]" />
      </div>

      {/* Efeito de profundidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-transparent" />

      {/* Linhas de energia */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 opacity-20">
          <motion.div
            className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scaleX: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      )}
    </motion.div>
  )
}

// Componente de Indicador de Progresso
const ProgressIndicator = ({ currentSlide, totalSlides }: { currentSlide: number; totalSlides: number }) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <motion.div
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === currentSlide
              ? 'w-8 bg-amber-500'
              : index < currentSlide
              ? 'w-1.5 bg-amber-500'
              : 'w-1.5 bg-white/20'
          }`}
          initial={{ scale: 0.8 }}
          animate={{ scale: index === currentSlide ? 1 : 0.8 }}
        />
      ))}
    </div>
  )
}

// Componente de Wrapper do Slide
const SlideWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="w-full h-full flex flex-col"
    >
      {children}
    </motion.div>
  )
}

// Componente de Input Estilizado
interface InputFieldProps {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  maxLength?: number
  minLength?: number
  showPasswordToggle?: boolean
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void
  onBlur?: () => void
  autoComplete?: string
  autoCapitalize?: string
  autoCorrect?: string
  spellCheck?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}

const InputField = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  minLength,
  showPasswordToggle = false,
  onPaste,
  onBlur,
  autoComplete,
  autoCapitalize,
  autoCorrect,
  spellCheck,
  inputMode
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/90">
        {label} {required && <span className="text-amber-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          onPaste={onPaste}
          onBlur={onBlur}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          inputMode={inputMode}
          className="w-full px-4 py-4 text-lg bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 outline-none transition-colors disabled:bg-white/5 disabled:cursor-not-allowed text-white placeholder:text-white/50"
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            tabIndex={0}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Componente de Botão Principal
const PrimaryButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button'
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 px-6 text-lg font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black shadow-lg shadow-amber-500/30"
      tabIndex={0}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Aguarde...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// Interface para dados do patrocinador
interface SponsorData {
  id: string
  name: string
  profileImage: string | null
  referralCode: string
}

const sanitizeEmailInput = (value: string) => value.replace(/\s+/g, '').toLowerCase()
const sanitizeDigits = (value: string) => value.replace(/\D/g, '')

const getPhoneSignature = (countryCode: string, number: string) => {
  return `${countryCode}:${sanitizeDigits(number)}`
}

const getMaskedPhone = (countryCode: string, number: string) => {
  const digits = sanitizeDigits(number)

  if (digits.length <= 4) {
    return `${countryCode} ${digits}`
  }

  const visibleDigits = digits.slice(-4)
  const maskedDigits = `${'*'.repeat(Math.max(0, digits.length - 4))}${visibleDigits}`

  return `${countryCode} ${maskedDigits}`
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(false)

  // Estados do formulário
  const [sponsorId, setSponsorId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [confirmEmailTouched, setConfirmEmailTouched] = useState(false)
  const [country, setCountry] = useState('BR')
  const [documentType, setDocumentType] = useState<DocumentType | ''>(DocumentType.CPF)
  const [documentNumber, setDocumentNumber] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+55')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isInviteFromUrl, setIsInviteFromUrl] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [smsCode, setSmsCode] = useState('')
  const [smsVerificationId, setSmsVerificationId] = useState('')
  const [smsVerificationToken, setSmsVerificationToken] = useState('')
  const [smsCodeSent, setSmsCodeSent] = useState(false)
  const [smsVerified, setSmsVerified] = useState(false)
  const [sendingSmsCode, setSendingSmsCode] = useState(false)
  const [verifyingSmsCode, setVerifyingSmsCode] = useState(false)
  const [smsRetryAfterSeconds, setSmsRetryAfterSeconds] = useState(0)
  const [verifiedPhoneSignature, setVerifiedPhoneSignature] = useState('')

  // Estados do patrocinador
  const [sponsorData, setSponsorData] = useState<SponsorData | null>(null)
  const [loadingSponsor, setLoadingSponsor] = useState(false)
  const [sponsorError, setSponsorError] = useState('')
  
  // Fluxo atual sem verificação por SMS (passo de SMS desativado temporariamente)
  const totalSlides = 4
  const emailValidation = email ? validateEmailWithDetails(email) : null
  const confirmEmailValidation = confirmEmail ? validateEmailWithDetails(confirmEmail) : null
  const currentPhoneSignature = getPhoneSignature(phoneCountryCode, phoneNumber)

  // Função para buscar dados do patrocinador
  const fetchSponsorData = async (code: string) => {
    if (code.length !== 6) return

    setLoadingSponsor(true)
    setSponsorError('')
    setSponsorData(null)

    try {
      const response = await fetch(`/api/auth/sponsor/${code.toUpperCase()}`)
      const data = await response.json()

      if (!response.ok) {
        setSponsorError(data.error || 'Patrocinador não encontrado')
        return
      }

      if (data.success && data.sponsor) {
        setSponsorData(data.sponsor)
      }
    } catch (error) {
      console.error('Erro ao buscar patrocinador:', error)
      setSponsorError('Erro ao buscar patrocinador')
    } finally {
      setLoadingSponsor(false)
    }
  }

  // Verificar parâmetro invite na URL
  useEffect(() => {
    const inviteCode = searchParams.get('invite')
    if (inviteCode) {
      const code = inviteCode.toUpperCase()
      setSponsorId(code)
      setIsInviteFromUrl(true)
      // Buscar dados do patrocinador automaticamente
      fetchSponsorData(code)
    }
  }, [searchParams])

  useEffect(() => {
    if (smsRetryAfterSeconds <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setSmsRetryAfterSeconds((currentValue) => Math.max(0, currentValue - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [smsRetryAfterSeconds])

  const resetSmsVerificationState = () => {
    setSmsCode('')
    setSmsVerificationId('')
    setSmsVerificationToken('')
    setSmsCodeSent(false)
    setSmsVerified(false)
    setSendingSmsCode(false)
    setVerifyingSmsCode(false)
    setSmsRetryAfterSeconds(0)
    setVerifiedPhoneSignature('')
  }

  const handleCountryChange = (selectedCountry: Country) => {
    if (selectedCountry.phoneCode !== phoneCountryCode && (smsCodeSent || smsVerified || smsVerificationToken)) {
      resetSmsVerificationState()
    }

    setCountry(selectedCountry.code)
    setPhoneCountryCode(selectedCountry.phoneCode)
    setDocumentType('')
    setDocumentNumber('')
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    toast.error('Por favor, digite o email manualmente para confirmar')
  }

  const handleEmailBlur = () => {
    const normalizedEmailValue = normalizeEmail(email)
    setEmailTouched(true)

    if (email !== normalizedEmailValue) {
      setEmail(normalizedEmailValue)
    }

    if (!normalizedEmailValue) {
      return
    }

    const emailResult = validateEmailWithDetails(normalizedEmailValue)

    if (!emailResult.isValid) {
      toast.error(emailResult.error || 'Digite um email válido')
      return
    }

    if (emailResult.warning) {
      toast.warning(emailResult.warning)
    }
  }

  const handleConfirmEmailBlur = () => {
    const normalizedConfirmEmailValue = normalizeEmail(confirmEmail)
    const normalizedEmailValue = normalizeEmail(email)
    setConfirmEmailTouched(true)

    if (confirmEmail !== normalizedConfirmEmailValue) {
      setConfirmEmail(normalizedConfirmEmailValue)
    }

    if (!normalizedConfirmEmailValue) {
      return
    }

    const confirmResult = validateEmailWithDetails(normalizedConfirmEmailValue)

    if (!confirmResult.isValid) {
      toast.error(confirmResult.error || 'Confirme um email válido')
      return
    }

    if (normalizedEmailValue && normalizedEmailValue !== normalizedConfirmEmailValue) {
      toast.error('Os emails digitados precisam ser idênticos')
    }
  }

  // Validação de cada slide
  const validateSlide = (slideIndex: number): boolean => {
    switch (slideIndex) {
      case 0: // Código do patrocinador
        if (!sponsorId.trim()) {
          toast.error('Digite o código do patrocinador')
          return false
        }
        if (sponsorId.length < 6) {
          toast.error('Código do patrocinador deve ter 6 caracteres')
          return false
        }
        if (!sponsorData) {
          toast.error('Aguarde a validação do código do patrocinador')
          return false
        }
        return true

      case 1: // Nome e email
        if (!name.trim()) {
          toast.error('Digite seu nome completo')
          return false
        }
        if (name.trim().length < 3) {
          toast.error('Nome deve ter pelo menos 3 caracteres')
          return false
        }
        if (!email.trim()) {
          toast.error('Digite seu email')
          return false
        }
        const normalizedEmailValue = normalizeEmail(email)
        const normalizedConfirmEmailValue = normalizeEmail(confirmEmail)
        const emailResult = validateEmailWithDetails(normalizedEmailValue)
        if (email !== normalizedEmailValue) {
          setEmail(normalizedEmailValue)
        }
        if (!emailResult.isValid) {
          toast.error(emailResult.error || 'Digite um email válido')
          return false
        }
        if (!confirmEmail.trim()) {
          toast.error('Confirme seu email')
          return false
        }
        const confirmEmailResult = validateEmailWithDetails(normalizedConfirmEmailValue)
        if (confirmEmail !== normalizedConfirmEmailValue) {
          setConfirmEmail(normalizedConfirmEmailValue)
        }
        if (!confirmEmailResult.isValid) {
          toast.error(confirmEmailResult.error || 'Confirme um email válido')
          return false
        }
        if (normalizedEmailValue !== normalizedConfirmEmailValue) {
          toast.error('Os emails não coincidem')
          return false
        }
        return true

      case 2: // País, telefone e documento
        if (!country) {
          toast.error('Selecione um país')
          return false
        }
        if (!documentType) {
          toast.error('Selecione o tipo de documento')
          return false
        }
        if (!documentNumber.trim()) {
          toast.error('Digite o número do documento')
          return false
        }
        if (!phoneNumber.trim()) {
          toast.error('Digite seu telefone')
          return false
        }
        return true
        
      case 3: // Senha
        if (!password) {
          toast.error('Digite sua senha')
          return false
        }
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres')
          return false
        }
        if (!confirmPassword) {
          toast.error('Confirme sua senha')
          return false
        }
        if (password !== confirmPassword) {
          toast.error('As senhas não coincidem')
          return false
        }
        if (!acceptedTerms) {
          toast.error('Você deve aceitar os termos de uso')
          return false
        }
        return true

      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentSlide < totalSlides - 1 && validateSlide(currentSlide)) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleSendSmsCode = async () => {
    if (!validateSlide(2)) {
      return
    }

    setSendingSmsCode(true)

    try {
      const response = await fetch('/api/auth/register/send-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneCountryCode,
          phoneNumber: sanitizeDigits(phoneNumber)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details?.retryAfterSeconds) {
          setSmsRetryAfterSeconds(Number(data.details.retryAfterSeconds))
        }

        throw new Error(data.error || 'Não foi possível enviar o código SMS')
      }

      const result = data.data as SendRegisterSmsCodeResult

      setSmsVerificationId(result.verificationId)
      setSmsVerificationToken('')
      setSmsCode('')
      setSmsCodeSent(true)
      setSmsVerified(false)
      setSmsRetryAfterSeconds(result.retryAfterSeconds)
      setVerifiedPhoneSignature('')
      setCurrentSlide(3)

      toast.success('Código SMS enviado com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar código SMS')
    } finally {
      setSendingSmsCode(false)
    }
  }

  const handleVerifySmsCode = async () => {
    if (!validateSlide(3)) {
      return
    }

    setVerifyingSmsCode(true)

    try {
      const response = await fetch('/api/auth/register/verify-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verificationId: smsVerificationId,
          phoneCountryCode,
          phoneNumber: sanitizeDigits(phoneNumber),
          code: smsCode.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível validar o código SMS')
      }

      const result = data.data as VerifyRegisterSmsCodeResult

      setSmsVerificationToken(result.verificationToken)
      setSmsVerified(true)
      setVerifiedPhoneSignature(currentPhoneSignature)
      setCurrentSlide(4)

      toast.success('Telefone validado com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao validar código SMS')
    } finally {
      setVerifyingSmsCode(false)
    }
  }
  
  const handleContinue = async () => {
    handleNext()
  }

  const handleSubmit = async () => {
    if (!validateSlide(currentSlide)) {
      return
    }

    setLoading(true)

    try {
      const requestBody = {
        name: name.toUpperCase(),
        email: normalizeEmail(email),
        password,
        sponsorId: sponsorId.trim(),
        country,
        documentType,
        documentNumber: sanitizeDigits(documentNumber),
        phoneCountryCode,
        phoneNumber: sanitizeDigits(phoneNumber)
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar usuário')
      }

      toast.success('Usuário registrado com sucesso!')
      setRegistrationSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Tela de sucesso
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center relative p-4">
        {/* Background similar ao HeroSection */}
        <BackgroundLayer />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-black/80 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 text-center relative z-10"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Cadastro realizado!</h2>
          <p className="text-white/80 mb-6">
            Enviamos um link de confirmação para <span className="font-semibold text-amber-400">{email}</span>
          </p>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 mb-6 text-left">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-white/80">
                Verifique também sua pasta de spam ou lixo eletrônico.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="w-full py-3 px-6 text-center font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl transition-colors shadow-lg shadow-amber-500/30"
            >
              Ir para Login
            </Link>
            <button
              onClick={() => {
                setRegistrationSuccess(false)
                setCurrentSlide(0)
                setSponsorId(searchParams.get('invite')?.toUpperCase() || '')
                setName('')
                setEmail('')
                setConfirmEmail('')
                setEmailTouched(false)
                setConfirmEmailTouched(false)
                setCountry('BR')
                setDocumentType(DocumentType.CPF)
                setDocumentNumber('')
                setPhoneCountryCode('+55')
                setPhoneNumber('')
                setPassword('')
                setConfirmPassword('')
                setAcceptedTerms(false)
                resetSmsVerificationState()
              }}
              className="text-white/80 hover:text-white py-2 transition-colors"
            >
              Criar outra conta
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4">
      {/* Background layer */}
      <BackgroundLayer />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo ou título */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo</h1>
          <p className="text-white/80">Vamos criar sua conta em alguns passos</p>
        </motion.div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/80 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10"
        >
          {/* Indicador de progresso */}
          <ProgressIndicator currentSlide={currentSlide} totalSlides={totalSlides} />

          {/* Slides */}
          <div className="min-h-[400px] flex flex-col">
            <AnimatePresence mode="wait">
              {/* Slide 1: Código do patrocinador */}
              {currentSlide === 0 && (
                <SlideWrapper key="slide-0">
                  <div className="flex-1 space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">Código do Patrocinador</h2>
                      <p className="text-white/80">Digite o código de quem indicou você</p>
                    </div>
                    <InputField
                      label="Código do patrocinador"
                      value={sponsorId}
                      onChange={(value) => {
                        const upperValue = value.toUpperCase()
                        setSponsorId(upperValue)
                        // Buscar automaticamente quando digitar 6 caracteres
                        if (upperValue.length === 6) {
                          fetchSponsorData(upperValue)
                        } else {
                          // Limpar dados do patrocinador se remover caracteres
                          setSponsorData(null)
                          setSponsorError('')
                        }
                      }}
                      placeholder="Digite o código"
                      required
                      maxLength={6}
                      disabled={isInviteFromUrl}
                    />

                    {/* Loading do patrocinador */}
                    {loadingSponsor && (
                      <div className="flex items-center justify-center gap-2 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-white/80">Buscando patrocinador...</span>
                      </div>
                    )}

                    {/* Dados do patrocinador */}
                    {sponsorData && !loadingSponsor && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border-2 border-green-400/30 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          {/* Foto do patrocinador */}
                          <div className="flex-shrink-0">
                            {sponsorData.profileImage ? (
                              <img
                                src={sponsorData.profileImage}
                                alt={sponsorData.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-green-400"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center border-2 border-green-400">
                                <span className="text-2xl font-bold text-white">
                                  {sponsorData.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Nome e check */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-sm font-medium text-green-300">Patrocinador encontrado!</span>
                            </div>
                            <p className="text-lg font-bold text-white truncate">{sponsorData.name}</p>
                            <p className="text-sm text-white/80">Código: {sponsorData.referralCode}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Erro ao buscar patrocinador */}
                    {sponsorError && !loadingSponsor && sponsorId.length === 6 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-red-600/40 backdrop-blur-md border-2 border-red-500/60 rounded-xl shadow-lg shadow-red-500/20"
                      >
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-red-100 mb-1">Código inválido</p>
                            <p className="text-sm text-red-50 font-medium">{sponsorError}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {isInviteFromUrl && (
                      <p className="text-sm text-amber-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Código preenchido automaticamente via convite
                      </p>
                    )}
                  </div>
                  <div className="space-y-3 mt-8">
                    <PrimaryButton onClick={handleNext}>Continuar</PrimaryButton>
                    <div className="text-center">
                      <Link href="/auth/login" className="text-sm text-white/80 hover:text-white transition-colors">
                        Já tenho uma conta
                      </Link>
                    </div>
                  </div>
                </SlideWrapper>
              )}

              {/* Slide 2: Nome e email */}
              {currentSlide === 1 && (
                <SlideWrapper key="slide-1">
                  <div className="flex-1 space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">Suas Informações</h2>
                      <p className="text-white/80">Como podemos te chamar?</p>
                    </div>
                    <InputField
                      label="Nome completo"
                      value={name}
                      onChange={(value) => setName(value.toUpperCase())}
                      placeholder="Digite seu nome completo"
                      required
                    />
                    <InputField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(value) => setEmail(sanitizeEmailInput(value))}
                      onBlur={handleEmailBlur}
                      placeholder="seu@email.com"
                      required
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
                      onPaste={(e) => {
                        e.preventDefault()
                        toast.error('Por favor, digite o email manualmente')
                      }}
                    />
                    {emailTouched && emailValidation && !emailValidation.isValid && (
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                        <p className="text-sm text-amber-100">{emailValidation.error}</p>
                        {emailValidation.suggestion && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmail(emailValidation.suggestion!)
                              if (!confirmEmail || normalizeEmail(confirmEmail) === normalizeEmail(email)) {
                                setConfirmEmail(emailValidation.suggestion!)
                              }
                            }}
                            className="mt-2 text-sm font-medium text-amber-300 hover:text-amber-200 underline"
                          >
                            Usar {emailValidation.suggestion}
                          </button>
                        )}
                      </div>
                    )}
                    {emailTouched && emailValidation?.isValid && emailValidation.warning && (
                      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
                        <p className="text-sm text-sky-100">{emailValidation.warning}</p>
                        <p className="mt-1 text-xs text-sky-200/90">
                          Se for um email pessoal, confirme se o domínio está certo, como `gmail.com`, `hotmail.com` ou `outlook.com`.
                        </p>
                      </div>
                    )}
                    <InputField
                      label="Confirmar email"
                      type="email"
                      value={confirmEmail}
                      onChange={(value) => setConfirmEmail(sanitizeEmailInput(value))}
                      onBlur={handleConfirmEmailBlur}
                      placeholder="Digite seu email novamente"
                      required
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
                      onPaste={(e) => {
                        e.preventDefault()
                        toast.error('Por favor, digite o email manualmente para confirmar')
                      }}
                    />
                    {confirmEmailTouched && confirmEmailValidation && !confirmEmailValidation.isValid && (
                      <p className="text-sm text-red-300">{confirmEmailValidation.error}</p>
                    )}
                    {confirmEmailTouched && emailValidation?.isValid && confirmEmailValidation?.isValid && confirmEmail && normalizeEmail(email) !== normalizeEmail(confirmEmail) && (
                      <p className="text-sm text-red-300">Os emails precisam ser idênticos para continuar.</p>
                    )}
                  </div>
                  <div className="space-y-3 mt-8">
                    <PrimaryButton onClick={handleContinue}>Continuar</PrimaryButton>
                    <button
                      onClick={handleBack}
                      className="w-full py-3 text-white/80 hover:text-white font-medium transition-colors"
                      tabIndex={0}
                    >
                      Voltar
                    </button>
                  </div>
                </SlideWrapper>
              )}

              {/* Slide 3: País, telefone e documento */}
              {currentSlide === 2 && (
                <SlideWrapper key="slide-2">
                  <div className="flex-1 space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">Mais Alguns Dados</h2>
                      <p className="text-white/80">Precisamos verificar sua identidade</p>
                    </div>
                    <CountrySelector
                      value={country}
                      onChange={handleCountryChange}
                      disabled={loading}
                    />
                    <PhoneInput
                      countryCode={phoneCountryCode}
                      phoneNumber={phoneNumber}
                      country={country}
                      onChange={(code, number) => {
                        const nextPhoneSignature = getPhoneSignature(code, number)

                        if (
                          nextPhoneSignature !== currentPhoneSignature &&
                          (smsCodeSent || smsVerified || !!smsVerificationToken || !!smsVerificationId)
                        ) {
                          resetSmsVerificationState()
                        }

                        setPhoneCountryCode(code)
                        setPhoneNumber(number)
                      }}
                      disabled={loading}
                    />
                    <DocumentInput
                      country={country}
                      documentType={documentType}
                      documentNumber={documentNumber}
                      onChange={(type, number) => {
                        setDocumentType(type)
                        setDocumentNumber(number)
                      }}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-3 mt-8">
                    <button
                      onClick={handleContinue}
                      className="w-full py-3 text-white font-medium transition-colors"
                      tabIndex={0}
                    >
                      Continuar
                    </button>
                    <button
                      onClick={handleBack}
                      className="w-full py-3 text-white/80 hover:text-white font-medium transition-colors"
                      tabIndex={0}
                    >
                      Voltar
                    </button>
                  </div>
                </SlideWrapper>
              )}

              {/* Slide 4: Senha */}
              {currentSlide === 3 && (
                <SlideWrapper key="slide-3">
                  <div className="flex-1 space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">Crie sua Senha</h2>
                      <p className="text-white/80">Escolha uma senha segura</p>
                    </div>
                    <InputField
                      label="Senha"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      showPasswordToggle
                    />
                    <InputField
                      label="Confirmar senha"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Digite a senha novamente"
                      required
                      minLength={6}
                      showPasswordToggle
                    />
                    <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="w-5 h-5 text-amber-500 border-white/30 rounded focus:ring-amber-500 bg-white/10 focus:bg-white/10 mt-0.5"
                      />
                      <label htmlFor="acceptTerms" className="text-sm text-white/90 flex-1">
                        Li e aceito os{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setModalType('terms')
                            setShowTermsModal(true)
                          }}
                          className="text-amber-400 hover:text-amber-300 underline font-medium"
                        >
                          termos de uso
                        </button>
                        {' '}e{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setModalType('privacy')
                            setShowTermsModal(true)
                          }}
                          className="text-amber-400 hover:text-amber-300 underline font-medium"
                        >
                          política de privacidade
                        </button>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-3 mt-8">
                    <PrimaryButton
                      onClick={handleSubmit}
                      loading={loading}
                      disabled={!acceptedTerms}
                    >
                      Criar Conta
                    </PrimaryButton>
                    <button
                      onClick={handleBack}
                      className="w-full py-3 text-white/80 hover:text-white font-medium transition-colors"
                      tabIndex={0}
                      disabled={loading}
                    >
                      Voltar
                    </button>
                  </div>
                </SlideWrapper>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Link para login abaixo do card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-6"
        >
          <Link href="/auth/login" className="text-white/80 hover:text-white transition-colors">
            Já tem uma conta? <span className="font-medium text-amber-400">Fazer login</span>
          </Link>
        </motion.div>
      </div>

      {/* Modal dos Termos */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => {
          setShowTermsModal(false)
          setModalType(null)
        }}
        title={modalType === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
        maxWidth="max-w-5xl"
      >
        {modalType === 'terms' && <TermosDeUsoPage />}
        {modalType === 'privacy' && <PrivacyPolicyPage />}
      </Modal>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-black to-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Carregando...</p>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
