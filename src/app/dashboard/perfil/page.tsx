'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import EditProfileModal from '@/components/EditProfileModal'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import BankAccountModal from '@/components/pagamento/BankAccountModal'
import PixKeyModal from '@/components/pagamento/PixKeyModal'
import FinancialPasswordModal from '@/components/FinancialPasswordModal'
import { translateRecipientStatus, getRecipientStatusClasses } from '@/lib/recipientStatusTranslator'
import RecipientStatusBadge from '@/components/RecipientStatusBadge'
import PhotoUploadModal from '@/components/PhotoUploadModal'
import { toast } from 'sonner'
import { getCountryByCode, getDocumentTypesByCountry, formatDocument as formatInternationalDocument } from '@/lib/international-utils'
import { DocumentType } from '@/generated/prisma'

interface BankAccount {
  id: string
  recipientId: string
  recipientName: string
  recipientEmail: string
  recipientDocument: string
  recipientType: 'individual' | 'company'
  recipientStatus: string
  bankCode: string
  bankName: string
  branchNumber: string
  branchCheckDigit?: string
  accountNumber: string
  accountCheckDigit: string
  accountType: 'checking' | 'savings'
  holderName: string
  holderType: 'individual' | 'company'
  holderDocument: string
  transferEnabled: boolean
  transferInterval: 'daily' | 'weekly' | 'monthly'
  transferDay?: number
  anticipationEnabled: boolean
  anticipationType?: 'full' | 'partial'
  anticipationVolumePercentage?: number
  anticipationDelay?: number
  createdAt: string
  updatedAt: string
}

interface PixKey {
  id: string
  pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
  pixKey: string
  accountHolderName: string
  bankName: string
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showBankAccountModal, setShowBankAccountModal] = useState(false)
  const [showPixModal, setShowPixModal] = useState(false)
  const [userBankAccount, setUserBankAccount] = useState<BankAccount | null>(null)
  const [userPixKey, setUserPixKey] = useState<PixKey | null>(null)
  const [isLoadingBankAccount, setIsLoadingBankAccount] = useState(false)
  const [isLoadingPixKey, setIsLoadingPixKey] = useState(false)
  const [isGeneratingKyc, setIsGeneratingKyc] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showFinancialPasswordModal, setShowFinancialPasswordModal] = useState(false)
  const [hasFinancialPassword, setHasFinancialPassword] = useState<boolean | null>(null)
  const [financialPasswordMode, setFinancialPasswordMode] = useState<'create' | 'update'>('create')
  const [isRemovingBankAccount, setIsRemovingBankAccount] = useState(false)
  const [isRemovingPixKey, setIsRemovingPixKey] = useState(false)
  const [removeProfileConfirm, setRemoveProfileConfirm] = useState<'bank' | 'pix' | null>(null)

  // Carregar dados do usuário
  useEffect(() => {
    if (user && isAuthenticated) {
      loadUserBankAccount()
      loadUserPixKey()
      loadUserProfilePhoto()
      checkFinancialPassword()
    }
  }, [user, isAuthenticated])

  useEffect(() => {
    if (!removeProfileConfirm) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRemoveProfileConfirm(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [removeProfileConfirm])

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

  const loadUserBankAccount = async () => {
    setIsLoadingBankAccount(true)
    try {
      const response = await fetch('/api/bank-account')
      if (response.ok) {
        const data = await response.json()
        setUserBankAccount(data.bankAccount)
      }
    } catch (error) {
      console.error('Erro ao carregar conta bancária:', error)
    } finally {
      setIsLoadingBankAccount(false)
    }
  }

  const loadUserPixKey = async () => {
    setIsLoadingPixKey(true)
    try {
      const response = await fetch('/api/auth/pix-key')
      if (response.ok) {
        const data = await response.json()
        setUserPixKey(data.pixKey)
      }
    } catch (error) {
      console.error('Erro ao carregar chave PIX:', error)
    } finally {
      setIsLoadingPixKey(false)
    }
  }

  const loadUserProfilePhoto = async () => {
    setIsLoadingPhoto(true)
    try {
      const response = await fetch('/api/profile/photo')
      if (response.ok) {
        const data = await response.json()
        setProfilePhotoUrl(data.photoUrl)
      }
    } catch (error) {
      console.error('Erro ao carregar foto de perfil:', error)
    } finally {
      setIsLoadingPhoto(false)
    }
  }

  const handlePhotoUploadComplete = (photoUrl: string) => {
    setProfilePhotoUrl(photoUrl)
    toast.success('Foto de perfil atualizada com sucesso!')
  }

  const handleGenerateKycLink = async () => {
    if (!userBankAccount?.recipientId) return

    setIsGeneratingKyc(true)
    try {
      const response = await fetch('/api/bank-account/kyc-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success && data.data?.kycLink) {
        // Abrir o link KYC em uma nova aba
        window.open(data.data.kycLink, '_blank')
      } else {
        // Mostrar mensagem de erro mais específica
        const errorMessage = data.error || 'Erro desconhecido'

        if (errorMessage.includes('IP não autorizado') || errorMessage.includes('configurar o IP')) {
          toast.error('⚠️ Configuração necessária: O IP do servidor precisa ser autorizado no Pagar.me. Entre em contato com o suporte técnico.')
        } else if (errorMessage.includes('autenticação')) {
          toast.error('❌ Erro de configuração: Verifique as credenciais da API Pagar.me.')
        } else {
          toast.error('❌ Erro ao gerar link de validação: ' + errorMessage)
        }
      }
    } catch (error) {
      console.error('Erro ao gerar link KYC:', error)
      alert('Erro ao gerar link de validação')
    } finally {
      setIsGeneratingKyc(false)
    }
  }

  const handlePixKeySuccess = () => {
    loadUserPixKey()
    setShowPixModal(false)
    toast.success('Chave PIX atualizada com sucesso!')
  }

  const executeRemoveBankAccount = async () => {
    if (!userBankAccount || isRemovingBankAccount) return
    setIsRemovingBankAccount(true)
    try {
      const response = await fetch('/api/bank-account', { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Não foi possível remover os dados bancários.')
        return
      }
      setUserBankAccount(null)
      toast.success(
        typeof data.message === 'string' ? data.message : 'Dados bancários removidos do perfil.'
      )
    } catch (e) {
      console.error(e)
      toast.error('Erro ao remover dados bancários.')
    } finally {
      setIsRemovingBankAccount(false)
    }
  }

  const executeRemovePixKey = async () => {
    if (!userPixKey || isRemovingPixKey) return
    setIsRemovingPixKey(true)
    try {
      const response = await fetch('/api/auth/pix-key', { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(typeof data.message === 'string' ? data.message : 'Não foi possível remover a chave PIX.')
        return
      }
      setUserPixKey(null)
      toast.success(
        typeof data.message === 'string' ? data.message : 'Chave PIX removida do perfil.'
      )
    } catch (e) {
      console.error(e)
      toast.error('Erro ao remover chave PIX.')
    } finally {
      setIsRemovingPixKey(false)
    }
  }

  const handleConfirmRemoveProfile = async () => {
    if (removeProfileConfirm === 'bank') {
      await executeRemoveBankAccount()
    } else if (removeProfileConfirm === 'pix') {
      await executeRemovePixKey()
    }
    setRemoveProfileConfirm(null)
  }

  const isRemoveConfirmBusy =
    removeProfileConfirm === 'bank' ? isRemovingBankAccount : removeProfileConfirm === 'pix' ? isRemovingPixKey : false

  const formatBankDocument = (document: string) => {
    const numbers = document.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
  }

  const formatAccountType = (type: string) => {
    return type === 'checking' ? 'Conta Corrente' : 'Conta Poupança'
  }

  const formatTransferInterval = (interval: string) => {
    const intervals = {
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal'
    }
    return intervals[interval as keyof typeof intervals] || interval
  }

  // Se ainda está carregando a autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Se não está autenticado
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-500 text-xl">Usuário não autenticado</div>
      </div>
    )
  }

  const fallbackDocumentLabels: Record<string, string> = {
    CPF: 'CPF',
    RG: 'RG',
    PASSPORT: 'Passaporte',
    RUT: 'RUT',
    DNI: 'DNI',
    NIE: 'NIE',
    SSN: 'SSN',
    CI: 'Carteira de Identidade',
    NATIONAL_ID: 'Documento Nacional',
    OTHER: 'Outro Documento'
  }

  const getDocumentTypeLabel = (type?: string | null, countryCode?: string | null) => {
    if (!type) return 'Não informado'
    const documents = getDocumentTypesByCountry(countryCode || 'BR')
    const documentInfo = documents.find(doc => doc.type === type)
    if (documentInfo) {
      return documentInfo.label
    }
    return fallbackDocumentLabels[type] || type
  }

  const getFormattedUserDocument = () => {
    const documentNumber = user.documentNumber || user.cpf
    if (!documentNumber) return 'Não informado'
    const documentType = (user.documentType as DocumentType) || DocumentType.CPF
    return formatInternationalDocument(documentType, documentNumber)
  }

  const getCountryDisplay = () => {
    if (!user.country) return 'Não informado'
    const countryInfo = getCountryByCode(user.country)
    if (countryInfo) {
      return `${countryInfo.flag} ${countryInfo.name}`
    }
    return user.country
  }

  const documentTypeLabel = getDocumentTypeLabel(user.documentType, user.country)
  const formattedDocumentNumber = getFormattedUserDocument()
  const countryDisplay = getCountryDisplay()

  const contaBancariaComponent = () => {
    return (
      <>
        {/* Conta Bancária */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Conta Bancária</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowBankAccountModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                {userBankAccount ? 'Editar Conta' : 'Cadastrar Conta'}
              </button>
              {userBankAccount ? (
                <button
                  type="button"
                  onClick={() => setRemoveProfileConfirm('bank')}
                  disabled={isRemovingBankAccount}
                  className="px-4 py-2 border border-red-300 text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
                  aria-label="Remover dados bancários do perfil"
                >
                  Remover do perfil
                </button>
              ) : null}
            </div>
          </div>

          {isLoadingBankAccount ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : userBankAccount ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Banco</label>
                  <p className="text-gray-800">{userBankAccount.bankName}</p>
                  <p className="text-gray-600 text-xs">Código: {userBankAccount.bankCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Agência</label>
                  <p className="text-gray-800 font-mono">
                    {userBankAccount.branchNumber}
                    {userBankAccount.branchCheckDigit && `-${userBankAccount.branchCheckDigit}`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Conta</label>
                  <p className="text-gray-800 font-mono">
                    {userBankAccount.accountNumber}-{userBankAccount.accountCheckDigit}
                  </p>
                  <p className="text-gray-600 text-xs">{formatAccountType(userBankAccount.accountType)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Titular</label>
                  <p className="text-gray-800">{userBankAccount.holderName}</p>
                  <p className="text-gray-600 text-xs">{formatBankDocument(userBankAccount.holderDocument)}</p>
                </div>
                {/* Transferências 
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Transferências</label>
                  <p className="text-gray-800">
                    {userBankAccount.transferEnabled ? 'Habilitadas' : 'Desabilitadas'}
                  </p>
                  {userBankAccount.transferEnabled && (
                    <p className="text-gray-600 text-xs">
                      {formatTransferInterval(userBankAccount.transferInterval)}
                      {userBankAccount.transferDay && ` - Dia ${userBankAccount.transferDay}`}
                    </p>
                  )}
                </div>*/}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
                  <RecipientStatusBadge
                    status={userBankAccount.recipientStatus}
                    size="sm"
                  />
                </div>
              </div>
              {/*
              {userBankAccount.anticipationEnabled && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-900 mb-1">Antecipação Automática</label>
                  <p className="text-gray-800">
                    {userBankAccount.anticipationType === 'full' ? 'Total' : 'Parcial'}
                    {userBankAccount.anticipationVolumePercentage && 
                      ` - ${userBankAccount.anticipationVolumePercentage}%`}
                    {userBankAccount.anticipationDelay && 
                      ` - Delay: ${userBankAccount.anticipationDelay} dias`}
                  </p>
                </div>
                
              )}
              */}
              {userBankAccount.recipientStatus !== 'active' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <RecipientStatusBadge
                      status={userBankAccount.recipientStatus}
                      showDescription={true}
                      showPermissions={true}
                      showKycButton={true}
                      size="md"
                    />
                  </div>

                  <p className="text-gray-600 text-xs">
                    Cadastrado em: {new Date(userBankAccount.createdAt).toLocaleDateString('pt-BR')} às {new Date(userBankAccount.createdAt).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-yellow-800">
                  Nenhuma conta bancária cadastrada. Cadastre uma conta para receber pagamentos.
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Meu Perfil
          </h2>
          <p className="text-gray-600">
            Gerencie suas informações pessoais, senha e conta bancária.
          </p>
        </div>

        {/* Informações do Usuário com Foto */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Editar Dados
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Foto de Perfil - Lado Esquerdo */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 mx-auto lg:mx-0">
                {isLoadingPhoto ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="relative">
                    {profilePhotoUrl ? (
                      <Image
                        src={profilePhotoUrl}
                        alt="Foto de perfil"
                        width={128}
                        height={128}
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                        unoptimized={true}
                        priority={true}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Botão de Upload Overlay */}
                    <div className="absolute -bottom-2 -right-2">
                      <button
                        onClick={() => setShowPhotoModal(true)}
                        className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                        aria-label="Alterar foto de perfil"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Texto de ajuda */}
              <p className="text-xs text-gray-500 mt-2 text-center lg:text-left">
                Clique no ícone para alterar
              </p>
            </div>

            {/* Informações - Lado Direito */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <p className="text-gray-900">{user.name || 'Não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <p className="text-gray-900">{user.phone || 'Não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                  <p className="text-gray-900">{documentTypeLabel}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número do Documento</label>
                  <p className="text-gray-900">{formattedDocumentNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                  <p className="text-gray-900">{countryDisplay}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Indicação</label>
                  <p className="text-gray-900 font-mono">{user.referralCode || String(user.id).padStart(6, '0')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Segurança */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Alterar Senha
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Cadastro</label>
              <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Último Login</label>
              <p className="text-gray-900">Nunca</p>
            </div>
          </div>

          {/* Senha Financeira */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-md font-semibold text-gray-900">Senha Financeira</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Proteja suas operações financeiras (saques e transferências)
                </p>
              </div>
              <button
                onClick={() => {
                  setFinancialPasswordMode(hasFinancialPassword ? 'update' : 'create')
                  setShowFinancialPasswordModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {hasFinancialPassword ? 'Atualizar Senha' : 'Criar Senha'}
              </button>
            </div>

            {hasFinancialPassword !== null && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {hasFinancialPassword ? (
                    <>
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-gray-700">Senha financeira configurada</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-gray-700">Senha financeira não configurada</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conta Bancária */}
        {contaBancariaComponent()}

        {/* Chave PIX */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Chave PIX</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowPixModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                {userPixKey ? 'Editar PIX' : 'Cadastrar PIX'}
              </button>
              {userPixKey ? (
                <button
                  type="button"
                  onClick={() => setRemoveProfileConfirm('pix')}
                  disabled={isRemovingPixKey}
                  className="px-4 py-2 border border-red-300 text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
                  aria-label="Remover chave PIX do perfil"
                >
                  Remover do perfil
                </button>
              ) : null}
            </div>
          </div>

          {isLoadingPixKey ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
            </div>
          ) : userPixKey ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Chave</label>
                  <p className="text-gray-900 font-medium">{userPixKey.pixKeyType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
                  <p className="text-gray-900 font-mono text-sm break-all">{userPixKey.pixKey}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titular</label>
                  <p className="text-gray-900">{userPixKey.accountHolderName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <p className="text-gray-900">{userPixKey.bankName}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-600 text-xs">
                  Cadastrado em: {new Date(userPixKey.createdAt).toLocaleDateString('pt-BR')} às {new Date(userPixKey.createdAt).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-yellow-800">
                  Nenhuma chave PIX cadastrada. Cadastre uma chave PIX para receber pagamentos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <BankAccountModal
        isOpen={showBankAccountModal}
        onClose={() => setShowBankAccountModal(false)}
        onSuccess={() => {
          loadUserBankAccount()
          setShowBankAccountModal(false)
          toast.success(userBankAccount ? 'Conta bancária atualizada!' : 'Conta bancária cadastrada!')
        }}
        initialData={userBankAccount ? {
          bankCode: userBankAccount.bankCode,
          branchNumber: userBankAccount.branchNumber,
          branchCheckDigit: userBankAccount.branchCheckDigit,
          accountNumber: userBankAccount.accountNumber,
          accountCheckDigit: userBankAccount.accountCheckDigit,
          accountType: userBankAccount.accountType,
          holderName: userBankAccount.holderName,
          holderType: userBankAccount.holderType,
          holderDocument: userBankAccount.holderDocument,
          recipientName: userBankAccount.recipientName,
          recipientEmail: userBankAccount.recipientEmail,
          recipientDocument: userBankAccount.recipientDocument,
          recipientType: userBankAccount.recipientType,
        } : null}
      />

      <PixKeyModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        onSuccess={handlePixKeySuccess}
      />

      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onUploadComplete={handlePhotoUploadComplete}
        currentPhotoUrl={profilePhotoUrl || undefined}
      />

      <FinancialPasswordModal
        isOpen={showFinancialPasswordModal}
        onClose={() => {
          setShowFinancialPasswordModal(false)
        }}
        onSuccess={() => {
          checkFinancialPassword()
          setShowFinancialPasswordModal(false)
        }}
        mode={financialPasswordMode}
      />

      {removeProfileConfirm ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={() => !isRemoveConfirmBusy && setRemoveProfileConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-profile-confirm-title"
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="remove-profile-confirm-title" className="text-base font-normal text-gray-900 mb-6">
              {removeProfileConfirm === 'bank'
                ? 'Deseja realmente remover a conta bancária?'
                : 'Deseja realmente remover a chave PIX?'}
            </h2>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveProfileConfirm(null)}
                disabled={isRemoveConfirmBusy}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveProfile}
                disabled={isRemoveConfirmBusy}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {isRemoveConfirmBusy ? 'Removendo…' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}