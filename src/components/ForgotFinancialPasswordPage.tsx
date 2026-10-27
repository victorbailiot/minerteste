'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { CountrySelector } from '@/components/international/CountrySelector'
import { DocumentInput } from '@/components/international/DocumentInput'
import { PhoneInput } from '@/components/international/PhoneInput'
import { DocumentType } from '@/generated/prisma'
import type { Country } from '@/lib/international-utils'
import { validateDocument } from '@/lib/international-utils'
import { useAuth } from '@/lib/hooks/useAuth'
import type {
  SendPasswordResetSmsCodeResult,
  VerifyPasswordResetSmsCodeResult
} from '@/model/forgot-password'
import { Lock, ArrowLeft, Mail } from 'lucide-react'

type RecoveryMethod = 'email' | 'phone'
type PhoneRecoveryStep = 'identify' | 'code' | 'password' | 'success'

const sanitizeDigits = (value: string) => value.replace(/\D/g, '')

const normalizeDocumentValue = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

const getMaskedPhone = (countryCode: string, phoneNumber: string) => {
  const digits = sanitizeDigits(phoneNumber)

  if (digits.length <= 4) {
    return `${countryCode} ${digits}`
  }

  return `${countryCode} ${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

const getDesktopDescription = (method: RecoveryMethod, phoneStep: PhoneRecoveryStep) => {
  if (method === 'email') {
    return 'Enviaremos um link de recuperação para o seu email cadastrado.'
  }

  if (phoneStep === 'identify') {
    return 'Informe país, documento e celular para receber um código por SMS'
  }

  if (phoneStep === 'code') {
    return 'Digite o código enviado por SMS para continuar'
  }

  if (phoneStep === 'password') {
    return 'Defina uma nova senha financeira para concluir a recuperação'
  }

  return 'Senha financeira redefinida com sucesso'
}

export default function ForgotFinancialPasswordPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('email')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  const [country, setCountry] = useState('BR')
  const [documentType, setDocumentType] = useState<DocumentType | ''>(DocumentType.CPF)
  const [documentNumber, setDocumentNumber] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+55')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneRecoveryStep, setPhoneRecoveryStep] = useState<PhoneRecoveryStep>('identify')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [smsCode, setSmsCode] = useState('')
  const [smsVerificationId, setSmsVerificationId] = useState('')
  const [smsVerificationToken, setSmsVerificationToken] = useState('')
  const [smsRetryAfterSeconds, setSmsRetryAfterSeconds] = useState(0)
  const [newFinancialPassword, setNewFinancialPassword] = useState('')
  const [confirmNewFinancialPassword, setConfirmNewFinancialPassword] = useState('')

  const phoneSummary = useMemo(
    () => getMaskedPhone(phoneCountryCode, phoneNumber),
    [phoneCountryCode, phoneNumber]
  )

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Você precisa estar autenticado para solicitar a recuperação de senha financeira')
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (smsRetryAfterSeconds <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setSmsRetryAfterSeconds((currentValue) => Math.max(0, currentValue - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [smsRetryAfterSeconds])

  const resetPhoneProgress = () => {
    setPhoneRecoveryStep('identify')
    setSmsCode('')
    setSmsVerificationId('')
    setSmsVerificationToken('')
    setSmsRetryAfterSeconds(0)
    setNewFinancialPassword('')
    setConfirmNewFinancialPassword('')
  }

  const handleCountryChange = (selectedCountry: Country) => {
    setCountry(selectedCountry.code)
    setPhoneCountryCode(selectedCountry.phoneCode)
    setDocumentType(selectedCountry.code === 'BR' ? DocumentType.CPF : '')
    setDocumentNumber('')
    setPhoneNumber('')
    resetPhoneProgress()
  }

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setEmailLoading(true)

    try {
      const response = await fetch('/api/auth/financial-password/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao solicitar recuperação')
      }

      setEmailSubmitted(true)
      toast.success(data.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro interno do servidor')
    } finally {
      setEmailLoading(false)
    }
  }

  const validatePhoneIdentity = () => {
    if (!country) {
      toast.error('Selecione um país')
      return false
    }

    if (!documentType) {
      toast.error('Selecione o tipo de documento')
      return false
    }

    if (!documentNumber.trim()) {
      toast.error('Digite o documento cadastrado')
      return false
    }

    if (!validateDocument(documentType, normalizeDocumentValue(documentNumber), country)) {
      toast.error('Documento inválido para o país selecionado')
      return false
    }

    if (!phoneNumber.trim()) {
      toast.error('Digite o celular cadastrado')
      return false
    }

    return true
  }

  const handleSendPhoneSmsCode = async () => {
    if (!validatePhoneIdentity()) {
      return
    }

    setPhoneLoading(true)

    try {
      const response = await fetch('/api/auth/financial-password/forgot/phone/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country,
          documentType,
          documentNumber,
          phoneCountryCode,
          phoneNumber: sanitizeDigits(phoneNumber),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details?.retryAfterSeconds) {
          setSmsRetryAfterSeconds(Number(data.details.retryAfterSeconds))
        }

        throw new Error(data.error || 'Não foi possível enviar o código SMS')
      }

      const result = data.data as SendPasswordResetSmsCodeResult

      setSmsVerificationId(result.verificationId)
      setSmsRetryAfterSeconds(result.retryAfterSeconds)
      setSmsCode('')
      setPhoneRecoveryStep('code')

      toast.success('Código SMS enviado com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar o código SMS')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyPhoneSmsCode = async () => {
    if (!smsVerificationId) {
      toast.error('Solicite um novo código SMS')
      return
    }

    if (smsCode.trim().length !== 6) {
      toast.error('Digite o código SMS com 6 dígitos')
      return
    }

    setPhoneLoading(true)

    try {
      const response = await fetch('/api/auth/financial-password/forgot/phone/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationId: smsVerificationId,
          phoneCountryCode,
          phoneNumber: sanitizeDigits(phoneNumber),
          code: smsCode.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível validar o código SMS')
      }

      const result = data.data as VerifyPasswordResetSmsCodeResult

      setSmsVerificationToken(result.verificationToken)
      setPhoneRecoveryStep('password')

      toast.success('Celular validado com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao validar o código SMS')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleResetFinancialPasswordByPhone = async () => {
    if (!smsVerificationToken) {
      toast.error('Valide o código SMS antes de redefinir a senha financeira')
      return
    }

    if (!newFinancialPassword) {
      toast.error('Digite a nova senha financeira')
      return
    }

    if (newFinancialPassword.length < 4 || newFinancialPassword.length > 20) {
      toast.error('A senha financeira deve ter entre 4 e 20 caracteres')
      return
    }

    if (!confirmNewFinancialPassword) {
      toast.error('Confirme a nova senha financeira')
      return
    }

    if (newFinancialPassword !== confirmNewFinancialPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setPhoneLoading(true)

    try {
      const response = await fetch('/api/auth/financial-password/forgot/phone/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country,
          documentType,
          documentNumber,
          phoneCountryCode,
          phoneNumber: sanitizeDigits(phoneNumber),
          verificationToken: smsVerificationToken,
          financialPassword: newFinancialPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível redefinir a senha financeira')
      }

      setPhoneRecoveryStep('success')
      toast.success(data.message || 'Senha financeira alterada com sucesso!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao redefinir a senha financeira')
    } finally {
      setPhoneLoading(false)
    }
  }

  const renderEmailForm = () => (
    <form className="space-y-6" onSubmit={handleEmailSubmit}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Importante:</strong> Você precisa estar autenticado. O link será enviado para o email da sua conta.
        </p>
      </div>

      <button
        type="submit"
        disabled={emailLoading}
        className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {emailLoading ? (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
            Enviando...
          </>
        ) : (
          <>
            <Mail className="w-5 h-5 mr-2" />
            Enviar Link de Recuperação
          </>
        )}
      </button>
    </form>
  )

  const renderPhoneForm = () => {
    if (phoneRecoveryStep === 'identify') {
      return (
        <div className="space-y-6">
          <CountrySelector
            value={country}
            onChange={handleCountryChange}
            disabled={phoneLoading}
            variant="light"
          />

          <PhoneInput
            countryCode={phoneCountryCode}
            phoneNumber={phoneNumber}
            country={country}
            onChange={(code, number) => {
              setPhoneCountryCode(code)
              setPhoneNumber(number)
              resetPhoneProgress()
            }}
            disabled={phoneLoading}
            variant="light"
          />

          <DocumentInput
            country={country}
            documentType={documentType}
            documentNumber={documentNumber}
            onChange={(type, number) => {
              setDocumentType(type)
              setDocumentNumber(number)
              resetPhoneProgress()
            }}
            disabled={phoneLoading}
            variant="light"
          />

          <button
            type="button"
            onClick={handleSendPhoneSmsCode}
            disabled={phoneLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {phoneLoading ? 'Enviando SMS...' : 'Enviar código por SMS'}
          </button>
        </div>
      )
    }

    if (phoneRecoveryStep === 'code') {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            Enviamos um código para o celular <span className="font-semibold">{phoneSummary}</span>.
          </div>

          <div>
            <label htmlFor="smsCode" className="block text-sm font-medium text-gray-700 mb-1">
              Código SMS
            </label>
            <input
              id="smsCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={smsCode}
              onChange={(event) => setSmsCode(sanitizeDigits(event.target.value).slice(0, 6))}
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Digite os 6 dígitos"
            />
          </div>

          <button
            type="button"
            onClick={handleVerifyPhoneSmsCode}
            disabled={phoneLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {phoneLoading ? 'Validando...' : 'Validar código'}
          </button>

          <button
            type="button"
            onClick={handleSendPhoneSmsCode}
            disabled={phoneLoading || smsRetryAfterSeconds > 0}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {smsRetryAfterSeconds > 0 ? `Reenviar em ${smsRetryAfterSeconds}s` : 'Reenviar código'}
          </button>

          <button
            type="button"
            onClick={resetPhoneProgress}
            disabled={phoneLoading}
            className="w-full text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Alterar dados informados
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          Celular validado com sucesso. Agora defina sua nova senha financeira.
        </div>

        <div>
          <label htmlFor="newFinancialPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Nova senha financeira
          </label>
          <input
            id="newFinancialPassword"
            type="password"
            autoComplete="new-password"
            value={newFinancialPassword}
            onChange={(event) => setNewFinancialPassword(event.target.value)}
            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Digite a nova senha (4 a 20 caracteres)"
          />
        </div>

        <div>
          <label htmlFor="confirmNewFinancialPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar nova senha financeira
          </label>
          <input
            id="confirmNewFinancialPassword"
            type="password"
            autoComplete="new-password"
            value={confirmNewFinancialPassword}
            onChange={(event) => setConfirmNewFinancialPassword(event.target.value)}
            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Digite a senha novamente"
          />
        </div>

        <button
          type="button"
          onClick={handleResetFinancialPasswordByPhone}
          disabled={phoneLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {phoneLoading ? 'Salvando...' : 'Salvar nova senha financeira'}
        </button>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const showSuccess = emailSubmitted || phoneRecoveryStep === 'success'
  const successTitle = emailSubmitted ? 'Email Enviado' : 'Senha Financeira Alterada'
  const successDescription = emailSubmitted
    ? 'Se você tiver uma senha financeira cadastrada, você receberá um link de recuperação no seu email.'
    : 'Sua senha financeira foi redefinida com sucesso.'

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-3/5 relative bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center z-0 opacity-80"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/60 via-gray-800/40 to-transparent z-10" />

        <div className="relative z-20 flex flex-col items-center justify-center w-full px-12 text-white">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-blue-300" />
            </div>
            <h1 className="text-4xl font-bold mb-6">
              {showSuccess ? successTitle : 'Recuperar Senha Financeira'}
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              {showSuccess
                ? successDescription
                : 'Escolha como deseja recuperar sua senha financeira e siga as instruções de segurança.'}
            </p>
            {!showSuccess && (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-gray-100">Recuperação por email ou celular</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  <span className="text-gray-100">Validação segura da identidade</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-2/5 bg-white flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {showSuccess ? successTitle : 'Recuperar Senha Financeira'}
            </h2>
          </div>

          {!showSuccess && (
            <>
              <div className="hidden lg:block">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Recuperar Senha Financeira
                </h2>
                <p className="text-sm text-gray-600">
                  {getDesktopDescription(recoveryMethod, phoneRecoveryStep)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecoveryMethod('phone')}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    recoveryMethod === 'phone'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Por celular
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryMethod('email')}
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    recoveryMethod === 'email'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Por email
                </button>
              </div>

              {recoveryMethod === 'email' ? renderEmailForm() : renderPhoneForm()}
            </>
          )}

          {showSuccess && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <Lock className="h-8 w-8 text-green-600" />
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {successTitle}
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                {successDescription}
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/perfil')}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Voltar ao Perfil
                </button>

                <Link
                  href="/auth/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  Voltar para o login
                </Link>
              </div>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/dashboard/perfil"
              className="inline-flex items-center font-medium text-blue-600 hover:text-blue-500 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar ao Perfil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
