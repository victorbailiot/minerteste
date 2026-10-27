'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  CreditCard,
  RefreshCw,
  Eye,
  Ban,
  UserCheck,
  Trash2,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Plus,
  Power,
  PowerOff,
  IdCard,
  RefreshCcw,
  Edit,
  Link as LinkIcon,
  Phone,
  Gift,
  CircleArrowUp
} from 'lucide-react'

import { formatCurrency } from '@/lib/utils'
import GeneratePackageModal from '@/components/modals/GeneratePackageModal'
import ChangePackageMinerModal from '@/components/modals/ChangePackageMinerModal'
import ConfirmationModal from '@/components/modals/ConfirmationModal'
import ChangeSponsorModal from '@/components/modals/ChangeSponsorModal'
import AddTransactionModal from '@/components/modals/AddTransactionModal'
import NetworkPointsHistory from '@/components/NetworkPointsHistory'
import PhotoViewModal from '@/components/PhotoViewModal'
import UserRolesPermissions from '@/components/user-details/UserRolesPermissions'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { CountrySelector } from '@/components/international/CountrySelector'
import { PhoneInput } from '@/components/international/PhoneInput'
import { DocumentInput } from '@/components/international/DocumentInput'
import { DocumentType } from '@/generated/prisma'
import type { Country } from '@/lib/international-utils'
import { getCountryByCode, getDocumentTypesByCountry, formatDocument as formatInternationalDocument } from '@/lib/international-utils'

interface User {
  id: number
  name: string
  email: string
  phone: string
  cpf: string | null
  country: string | null
  documentType: string | null
  documentNumber: string | null
  phoneCountryCode: string | null
  phoneNumber: string | null
  photoUrl: string | null
  status: 'active' | 'inactive' | 'banned'
  package: string | null
  registeredAt: string
  totalEarnings: number
  balance: number
  referrals: number
  role: string
  isActive: boolean
  autoActivation: boolean
  lastLogin: string | null
  referralCode: string
  sponsorId: number | null
  updatedAt: string
  packages: Array<{
    id: number
    name: string
    price: number
    isActive: boolean
    activatedAt: string
    expiresAt: string | null
    excludeFromPointsCalculation: boolean
    transactionDescription: string | null
    minerId: number | null
    minerName: string | null
    canDelete: boolean
    directBonus?: number
    generatedBonuses?: PackageGeneratedBonuses | null
    upgrade?: PackageUpgradeInfo | null
  }>
  _count: {
    referrals: number
    transactions: number
    withdrawals: number
    contracts: number
    profitDistributions: number
  }
}

interface Bonus {
  id: number
  type: string
  amount: number
  description: string
  createdAt: string
  status: string
}

interface Withdrawal {
  id: number
  amount: number
  status: string
  requestedAt: string
  processedAt?: string
  description?: string
}

interface Activation {
  id: number
  type: string
  amount: number
  bonusUsed: number | null
  conversionPercent: number | null
  activatedAt: string
  expiresAt: string
  status: string
  correlationID: string | null
  transactionId: number | null
}



interface Contract {
  id: number
  packageId: number
  title: string
  content: string
  version: string
  status: string
  signedAt: string | null
  pdfPath: string | null
  createdAt: string
  package: {
    name: string
    price: number
  } | null
}

interface ProfitDistribution {
  id: number
  packageId: number
  amount: number
  profitPercent: number
  totalProfit: number
  periodStart: string
  periodEnd: string
  status: string
  processedAt: string | null
  package: {
    name: string
    profitSharePercent: number
  }
}

interface PixKey {
  id: number
  pixKeyType: string
  pixKey: string
  accountHolderName: string
  bankName: string
  createdAt: string
}

interface FinancialTransaction {
  id: number
  type: string
  amount: number
  description: string
  status: string
  createdAt: string
  userId: number | null
  sourceUserId: number | null
  level: number | null
  receiverName: string | null
  sourceName: string | null
  isReceived: boolean
  isGenerated: boolean
}



interface NetworkInfo {
  id: number
  sponsorId: number | null
  sponsor: {
    id: number
    name: string
    email: string
    referralCode: string
    isActive: boolean
  } | null
  referrals: Array<{
    id: number
    name: string
    email: string
    referralCode: string
    isActive: boolean
    createdAt: string
    packages: Array<{
      package: {
        name: string
        price: number
      }
    }>
  }>
}

interface CareerBenefits {
  requiredPoints: number
  maxTeamVolumePercent: number
  indirectBonusLevels: number
  reactivationLevels: number
  extraProfitPercent: number
  travelBonus?: string | null
  travelValue?: number | null
  requiredDirects?: number
  careerBonusAmount?: number | null
  careerPrizeDescription?: string | null
  careerPrizeValue?: number | null
}

interface CareerInfo {
  currentLevel: {
    levelId: number
    levelName: string
    ownPoints: number
    networkPoints: number
    totalPoints: number
    teamVolume: number
    isActive: boolean
    lastUpdated: string
    benefits: CareerBenefits | null
  } | null
  history: Array<{
    id: number
    levelId: number
    levelName: string
    totalNetworkPoints: number
    validPoints: number
    maxTeamVolumePercent: number
    graduatedAt: string
    benefits: CareerBenefits
  }>
  allLevels: Array<{
    id: number
    name: string
    requiredPoints: number
    maxTeamVolumePercent: number
    indirectBonusLevels: number
    reactivationLevels: number
    extraProfitPercent: number
    requiredDirects: number
  }>
}


const ADMIN_GENERATED_PHRASE = 'Gerado pelo Admin'

interface PackageGeneratedBonuses {
  identifiable: boolean
  directGenerated: boolean
  directAmount: number
  indirectGenerated: boolean
  indirectAmount: number
  indirectCount: number
  purchasePackageCount: number
}

interface PackageUpgradeInfo {
  available: boolean
  sourcePackageId: number | null
  sourcePackageName: string | null
  targetPackageId: number | null
  targetPackageName: string | null
  packagesInGroup: number | null
  upgradeCount: number | null
  rule: 'count' | 'value' | null
  origin: 'admin' | 'normal' | null
}

const renderGeneratedBonusStatus = (
  identifiable: boolean,
  generated: boolean,
  amount: number,
  suffix?: string
) => {
  if (!identifiable) {
    return (
      <span className="text-gray-400" title="Pacote sem transação ou sem correlationID">
        Não identificado
      </span>
    )
  }

  if (!generated) {
    return <span className="text-red-600">Não gerado</span>
  }

  return (
    <span className="text-green-600">
      Gerado {formatCurrency(amount)}{suffix ? ` ${suffix}` : ''}
    </span>
  )
}

const renderTransactionDescription = (description: string) => {
  if (!description.includes(ADMIN_GENERATED_PHRASE)) {
    return description
  }

  return description.split(ADMIN_GENERATED_PHRASE).map((part, index, parts) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 && (
        <span className="text-orange-600">{ADMIN_GENERATED_PHRASE}</span>
      )}
    </span>
  ))
}


export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const { isSuperAdmin, hasPermission } = usePermissions()
  const canActivatePackages = isSuperAdmin() || hasPermission('packages.activate')
  const canDeletePackages = isSuperAdmin() || hasPermission('packages.delete')
  const canCreateBonus = isSuperAdmin() || hasPermission('bonus.create')
  // Upgrade altera pacotes: exige a mesma permissão de ativar/desativar (validada também na API)
  const canUpgradePackages = canActivatePackages

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [bonusesPage, setBonusesPage] = useState(1)
  const [bonusesPerPage, setBonusesPerPage] = useState(10)
  const [bonusesMeta, setBonusesMeta] = useState<{ page: number; perPage: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [activations, setActivations] = useState<Activation[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [profitDistributions, setProfitDistributions] = useState<ProfitDistribution[]>([])
  const [pixKey, setPixKey] = useState<PixKey | null>(null)
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([])
  const [financialTransactionTypes, setFinancialTransactionTypes] = useState<string[]>([])
  const [financialTransactionsFiltered, setFinancialTransactionsFiltered] = useState<FinancialTransaction[]>([])
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all')
  const [selectedTransactionOrigin, setSelectedTransactionOrigin] = useState<string>('all')
  const [transactionNameFilter, setTransactionNameFilter] = useState<string>('')
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [careerInfo, setCareerInfo] = useState<CareerInfo | null>(null)

  const [bonusesLoading, setBonusesLoading] = useState(false)
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)
  const [activationsLoading, setActivationsLoading] = useState(false)
  const [contractsLoading, setContractsLoading] = useState(false)

  // Modal states
  const [isGeneratePackageModalOpen, setIsGeneratePackageModalOpen] = useState(false)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [packageToDelete, setPackageToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPhotoViewModalOpen, setIsPhotoViewModalOpen] = useState(false)
  const [isAddFinancialTransactionModalOpen, setIsAddFinancialTransactionModalOpen] = useState(false)
  const [isDeleteTransactionModalOpen, setIsDeleteTransactionModalOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null)
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false)
  
  // Package toggle states
  const [packageToToggle, setPackageToToggle] = useState<number | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [packageToChangeMiner, setPackageToChangeMiner] = useState<number | null>(null)
  const [isChangingPackageMiner, setIsChangingPackageMiner] = useState(false)
  const [isReloadingPackages, setIsReloadingPackages] = useState(false)
  const [packageToGenerateBonuses, setPackageToGenerateBonuses] = useState<number | null>(null)
  const [isGeneratingBonuses, setIsGeneratingBonuses] = useState(false)
  const [allowAdminGeneratedBonuses, setAllowAdminGeneratedBonuses] = useState(false)
  const [packageToUpgrade, setPackageToUpgrade] = useState<number | null>(null)
  const [isUpgradingPackage, setIsUpgradingPackage] = useState(false)
  const [profitDistributionsLoading, setProfitDistributionsLoading] = useState(false)
  const [pixKeyLoading, setPixKeyLoading] = useState(false)
  const [financialTransactionsLoading, setFinancialTransactionsLoading] = useState(false)
  const [networkInfoLoading, setNetworkInfoLoading] = useState(false)
  const [careerInfoLoading, setCareerInfoLoading] = useState(false)
  const [fixingDirectBonus, setFixingDirectBonus] = useState(false)

  const [bonusesLoaded, setBonusesLoaded] = useState(false)
  const [withdrawalsLoaded, setWithdrawalsLoaded] = useState(false)
  const [activationsLoaded, setActivationsLoaded] = useState(false)
  const [contractsLoaded, setContractsLoaded] = useState(false)
  const [profitDistributionsLoaded, setProfitDistributionsLoaded] = useState(false)
  const [pixKeyLoaded, setPixKeyLoaded] = useState(false)
  const [financialTransactionsLoaded, setFinancialTransactionsLoaded] = useState(false)
  const [networkInfoLoaded, setNetworkInfoLoaded] = useState(false)
  const [careerInfoLoaded, setCareerInfoLoaded] = useState(false)

  // Change Sponsor Modal states
  const [isChangeSponsorModalOpen, setIsChangeSponsorModalOpen] = useState(false)
  const [isConfirmChangeSponsorModalOpen, setIsConfirmChangeSponsorModalOpen] = useState(false)
  const [newSponsorData, setNewSponsorData] = useState<{ id: number; name: string } | null>(null)
  const [isChangingSponsor, setIsChangingSponsor] = useState(false)
  const [isLoadingNetworkForSponsor, setIsLoadingNetworkForSponsor] = useState(false)

  // Ban/Activate User Modal states
  const [isConfirmUserStatusModalOpen, setIsConfirmUserStatusModalOpen] = useState(false)
  const [isChangingUserStatus, setIsChangingUserStatus] = useState(false)

  // Password Reset Modal states
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false)
  const [isGeneratingResetLink, setIsGeneratingResetLink] = useState(false)
  const [generatedResetLink, setGeneratedResetLink] = useState<string | null>(null)

  // Modal de reset da senha financeira
  const [isFinancialPasswordResetModalOpen, setIsFinancialPasswordResetModalOpen] = useState(false)
  const [isGeneratingFinancialResetLink, setIsGeneratingFinancialResetLink] = useState(false)
  const [generatedFinancialResetLink, setGeneratedFinancialResetLink] = useState<string | null>(null)

  // Edit User Modal states
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: ''
  })
  const [editCountry, setEditCountry] = useState('BR')
  const [editDocumentType, setEditDocumentType] = useState<DocumentType | ''>(DocumentType.CPF)
  const [editDocumentNumber, setEditDocumentNumber] = useState('')
  const [editPhoneCountryCode, setEditPhoneCountryCode] = useState('+55')
  const [editPhoneNumber, setEditPhoneNumber] = useState('')

  // Filtro de pacotes
  const [packageFilter, setPackageFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>('all')
  const [packageDateStart, setPackageDateStart] = useState<string>('')
  const [packageDateEnd, setPackageDateEnd] = useState<string>('')

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('pacotes')

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`)
      const data = await response.json()

      if (data.success) {
        setUser(data.data)
      } else {
        console.error('Erro ao buscar usuário:', data.error)
        router.push('/admin/usuarios')
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error)
      router.push('/admin/usuarios')
    } finally {
      setLoading(false)
    }
  }, [userId, router])

  const reloadPackages = useCallback(async () => {
    try {
      setIsReloadingPackages(true)
      const response = await fetch(`/api/admin/users/${userId}`)
      const data = await response.json()

      if (data.success) {
        setUser((prev) => (prev ? { ...prev, packages: data.data.packages } : data.data))
      } else {
        toast.error('Erro ao recarregar pacotes', {
          description: data.error || 'Não foi possível atualizar a lista de pacotes.'
        })
      }
    } catch (error) {
      console.error('Erro ao recarregar pacotes:', error)
      toast.error('Erro ao recarregar pacotes', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsReloadingPackages(false)
    }
  }, [userId])

  const fetchBonuses = useCallback(async () => {
    try {
      setBonusesLoading(true)
      const params = new URLSearchParams({ page: String(bonusesPage), perPage: String(bonusesPerPage) })
      const response = await fetch(`/api/admin/users/${userId}/bonuses?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setBonuses(data.data)
        setBonusesMeta(data.meta || null)
        setBonusesLoaded(true)
      } else {
        console.error('Erro ao buscar bônus:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar bônus:', error)
    } finally {
      setBonusesLoading(false)
    }
  }, [userId, bonusesPage, bonusesPerPage])

  const handleBonusesPrev = () => {
    if (bonusesMeta?.hasPrevPage) {
      setBonusesPage((p) => Math.max(p - 1, 1))
    }
  }

  const handleBonusesNext = () => {
    if (bonusesMeta?.hasNextPage) {
      setBonusesPage((p) => p + 1)
    }
  }

  useEffect(() => {
    if (!bonusesLoaded) {
      fetchBonuses()
    }
  }, [bonusesPage, bonusesPerPage, bonusesLoaded, fetchBonuses])



  const fetchWithdrawals = useCallback(async () => {
    try {
      setWithdrawalsLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/withdrawals`)
      const data = await response.json()

      if (data.success) {
        setWithdrawals(data.data)
        setWithdrawalsLoaded(true)
      } else {
        console.error('Erro ao buscar saques:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar saques:', error)
    } finally {
      setWithdrawalsLoading(false)
    }
  }, [userId])

  const fetchActivations = useCallback(async () => {
    try {
      setActivationsLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/activations`)
      const data = await response.json()

      if (data.success) {
        setActivations(data.data)
        setActivationsLoaded(true)
      } else {
        console.error('Erro ao buscar ativações:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar ativações:', error)
    } finally {
      setActivationsLoading(false)
    }
  }, [userId])



  const fetchContracts = useCallback(async () => {
    try {
      setContractsLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/contracts`)
      const data = await response.json()

      if (data.success) {
        setContracts(data.data)
        setContractsLoaded(true)
      } else {
        console.error('Erro ao buscar contratos:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
    } finally {
      setContractsLoading(false)
    }
  }, [userId])

  const fetchProfitDistributions = useCallback(async () => {
    try {
      setProfitDistributionsLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/profit-distributions`)
      const data = await response.json()

      if (data.success) {
        setProfitDistributions(data.data)
        setProfitDistributionsLoaded(true)
      } else {
        console.error('Erro ao buscar distribuições de lucro:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar distribuições de lucro:', error)
    } finally {
      setProfitDistributionsLoading(false)
    }
  }, [userId])

  const fetchPixKey = useCallback(async () => {
    try {
      setPixKeyLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/pix-key`)
      const data = await response.json()

      if (data.success) {
        setPixKey(data.data)
        setPixKeyLoaded(true)
      } else {
        console.error('Erro ao buscar chave PIX:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar chave PIX:', error)
    } finally {
      setPixKeyLoading(false)
    }
  }, [userId])

  const fetchFinancialTransactions = useCallback(async () => {
    try {
      setFinancialTransactionsLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/financial-transactions`)
      const data = await response.json()

      if (data.success) {
        setFinancialTransactions(data.data)
        setFinancialTransactionTypes(data.types || [])
        setFinancialTransactionsFiltered(data.data)
        setFinancialTransactionsLoaded(true)
        // Resetar filtros ao carregar novos dados
        setSelectedTransactionType('all')
        setSelectedTransactionOrigin('all')
        setTransactionNameFilter('')
      } else {
        console.error('Erro ao buscar transações financeiras:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar transações financeiras:', error)
    } finally {
      setFinancialTransactionsLoading(false)
    }
  }, [userId])

  const handleFixDirectBonus = async () => {
    if (fixingDirectBonus) return
    setFixingDirectBonus(true)
    try {
      const res = await fetch('/api/business/fix-direct-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Erro ao processar correção de bônus')
        return
      }
      const { totalDownlinesAnalyzed, totalCorrected, totalAmountCorrected } = data.data
      if (totalCorrected > 0) {
        toast.success(
          `${totalCorrected} bônus corrigido(s) — R$ ${Number(totalAmountCorrected).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} adicionado(s)`
        )
        fetchFinancialTransactions()
      } else {
        toast.info(`${totalDownlinesAnalyzed} downline(s) analisado(s) — bônus em dia`)
      }
    } catch {
      toast.error('Erro de conexão ao processar correção de bônus')
    } finally {
      setFixingDirectBonus(false)
    }
  }

  // Criar nova transação financeira
  const handleCreateFinancialTransaction = async (data: {
    type: string
    amount: number
    description: string
    status: string
    userId: number
    sourceUserId?: number
  }) => {
    const loadingToast = toast.loading('Salvando transação...', {
      description: 'Aguarde enquanto processamos sua solicitação.'
    })

    try {
      const response = await fetch(`/api/admin/users/${userId}/transactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar transação')
      }

      setIsAddFinancialTransactionModalOpen(false)
      await fetchFinancialTransactions()
      
      // Remover toast de loading e mostrar sucesso
      toast.dismiss(loadingToast)
      toast.success('Transação criada com sucesso!', {
        description: `Transação de ${formatCurrency(data.amount)} registrada.`
      })
      
    } catch (error) {
      console.error('Erro ao criar transação:', error)
      toast.dismiss(loadingToast)
      toast.error('Erro ao criar transação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      throw error
    }
  }

  // Verificar se transação pode ser deletada (menos de 24 horas)
  const canDeleteTransaction = (createdAt: string): boolean => {
    const now = new Date()
    const transactionDate = new Date(createdAt)
    const hoursDiff = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60)
    return hoursDiff < 24
  }

  // Abrir modal de confirmação para deletar transação
  const handleDeleteTransaction = (transactionId: number) => {
    setTransactionToDelete(transactionId)
    setIsDeleteTransactionModalOpen(true)
  }

  // Confirmar e executar exclusão da transação
  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return

    setIsDeletingTransaction(true)
    const loadingToast = toast.loading('Excluindo transação...', {
      description: 'Aguarde enquanto processamos sua solicitação.'
    })

    try {
      const response = await fetch(`/api/admin/users/${userId}/transactions/${transactionToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir transação')
      }

      await fetchFinancialTransactions()
      
      setIsDeleteTransactionModalOpen(false)
      setTransactionToDelete(null)
      
      toast.dismiss(loadingToast)
      toast.success('Transação excluída com sucesso!', {
        description: 'A transação foi removida do sistema.'
      })
    } catch (error) {
      console.error('Erro ao excluir transação:', error)
      toast.dismiss(loadingToast)
      toast.error('Erro ao excluir transação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsDeletingTransaction(false)
    }
  }

  // Aplicar filtros nas transações financeiras
  const applyFinancialTransactionFilters = useCallback(() => {
    let filtered = [...financialTransactions]

    // Filtrar por tipo de transação
    if (selectedTransactionType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedTransactionType)
    }

    // Filtrar por origem
    if (selectedTransactionOrigin === 'received') {
      filtered = filtered.filter(t => t.isReceived)
    } else if (selectedTransactionOrigin === 'generated') {
      filtered = filtered.filter(t => t.isGenerated)
    }

    // Filtrar por nome (Gerado por ou Recebido por)
    if (transactionNameFilter.trim()) {
      const searchTerm = transactionNameFilter.trim().toLowerCase()
      filtered = filtered.filter(t => {
        const sourceNameMatch = t.sourceName?.toLowerCase().includes(searchTerm) || false
        const receiverNameMatch = t.receiverName?.toLowerCase().includes(searchTerm) || false
        return sourceNameMatch || receiverNameMatch
      })
    }

    setFinancialTransactionsFiltered(filtered)
  }, [financialTransactions, selectedTransactionType, selectedTransactionOrigin, transactionNameFilter])

  // useEffect para aplicar filtros quando mudarem
  useEffect(() => {
    if (financialTransactionsLoaded) {
      applyFinancialTransactionFilters()
    }
  }, [selectedTransactionType, selectedTransactionOrigin, transactionNameFilter, financialTransactionsLoaded, applyFinancialTransactionFilters])



  const fetchNetworkInfo = useCallback(async () => {
    try {
      setNetworkInfoLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/network`)
      const data = await response.json()

      if (data.success) {
        setNetworkInfo(data.data)
        setNetworkInfoLoaded(true)
      } else {
        console.error('Erro ao buscar informações de rede:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar informações de rede:', error)
    } finally {
      setNetworkInfoLoading(false)
    }
  }, [userId])

  const fetchCareerInfo = useCallback(async () => {
    try {
      setCareerInfoLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/career`)
      const data = await response.json()

      if (data.success) {
        setCareerInfo(data.data)
        setCareerInfoLoaded(true)
      } else {
        console.error('Erro ao buscar informações de carreira:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar informações de carreira:', error)
    } finally {
      setCareerInfoLoading(false)
    }
  }, [userId])


  const handleUserAction = async (action: string) => {
    if (!user) return

    try {
      let response

      switch (action) {
        case 'ban':
          response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: false })
          })
          break
        case 'activate':
          response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: true })
          })
          break
        case 'delete':
          if (confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) {
            response = await fetch(`/api/admin/users?userId=${userId}`, {
              method: 'DELETE'
            })
          } else {
            return
          }
          break
        default:
          return
      }

      if (response?.ok) {
        fetchUserDetails() // Recarregar dados do usuário
      } else {
        console.error('Erro ao executar ação:', action)
      }
    } catch (error) {
      console.error('Erro ao executar ação:', error)
    }
  }

  const handleOpenUserStatusModal = () => {
    setIsConfirmUserStatusModalOpen(true)
  }

  const handleConfirmUserStatusChange = async () => {
    if (!user) return

    setIsChangingUserStatus(true)
    try {
      const action = user.isActive ? 'ban' : 'activate'
      await handleUserAction(action)
      
      toast.success(user.isActive ? 'Usuário banido com sucesso' : 'Usuário ativado com sucesso', {
        description: user.isActive 
          ? 'O usuário foi desabilitado e não poderá acessar o sistema.' 
          : 'O usuário foi reativado e pode acessar o sistema normalmente.'
      })
      
      setIsConfirmUserStatusModalOpen(false)
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error)
      toast.error('Erro ao alterar status do usuário', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsChangingUserStatus(false)
    }
  }

  const handleCancelUserStatusChange = () => {
    setIsConfirmUserStatusModalOpen(false)
  }

  const handleGeneratePackageSuccess = () => {
    // Recarregar dados do usuário após gerar pacote
    fetchUserDetails()
  }

  const handleDeletePackage = (packageId: number) => {
    setPackageToDelete(packageId)
    setIsConfirmationModalOpen(true)
  }

  const confirmDeletePackage = async () => {
    if (!packageToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}/packages/${packageToDelete}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        // Recarregar dados do usuário após deletar pacote
        fetchUserDetails()
        toast.success('Pacote excluído com sucesso', {
          description: 'O pacote foi removido da conta do usuário.'
        })
        setIsConfirmationModalOpen(false)
        setPackageToDelete(null)
      } else {
        toast.error('Erro ao excluir pacote', {
          description: data.error || 'Não foi possível excluir o pacote.'
        })
      }
    } catch (error) {
      console.error('Erro ao excluir pacote:', error)
      toast.error('Erro ao excluir pacote', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeletePackage = () => {
    setIsConfirmationModalOpen(false)
    setPackageToDelete(null)
  }

  const handleTogglePackage = (packageId: number) => {
    setPackageToToggle(packageId)
  }

  const confirmTogglePackage = async () => {
    if (!packageToToggle) return

    setIsToggling(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}/packages/${packageToToggle}/toggle`, {
        method: 'PATCH'
      })

      const data = await response.json()

      if (data.success) {
        // Recarregar dados do usuário após alterar status do pacote
        fetchUserDetails()
        toast.success(data.message, {
          description: 'O status do pacote foi alterado com sucesso.'
        })
        setPackageToToggle(null)
      } else {
        toast.error('Erro ao alterar status do pacote', {
          description: data.error || 'Não foi possível alterar o status do pacote.'
        })
      }
    } catch (error) {
      console.error('Erro ao alterar status do pacote:', error)
      toast.error('Erro ao alterar status do pacote', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsToggling(false)
    }
  }

  const cancelTogglePackage = () => {
    setPackageToToggle(null)
  }

  const handleOpenGenerateBonuses = (packageId: number) => {
    setAllowAdminGeneratedBonuses(false)
    setPackageToGenerateBonuses(packageId)
  }

  const confirmGenerateBonuses = async () => {
    if (!packageToGenerateBonuses) return

    setIsGeneratingBonuses(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/packages/${packageToGenerateBonuses}/generate-bonuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowAdminGenerated: allowAdminGeneratedBonuses })
      })
      const data = await response.json()

      if (data.success) {
        await reloadPackages()
        const generated = (data.data?.direct?.attempted && data.data?.direct?.generated) ||
          (data.data?.indirect?.attempted && data.data?.indirect?.generated)
        if (generated) {
          toast.success(data.message || 'Bônus processados com sucesso')
        } else {
          toast.info(data.message || 'Nenhum bônus novo foi gerado')
        }
        setPackageToGenerateBonuses(null)
      } else {
        toast.error('Erro ao gerar bônus', {
          description: data.error || 'Não foi possível gerar os bônus deste pacote.'
        })
      }
    } catch (error) {
      console.error('Erro ao gerar bônus do pacote:', error)
      toast.error('Erro ao gerar bônus', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsGeneratingBonuses(false)
    }
  }

  const handleOpenUpgradePackage = (packageId: number) => {
    setPackageToUpgrade(packageId)
  }

  const confirmUpgradePackage = async () => {
    if (!packageToUpgrade) return

    setIsUpgradingPackage(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/packages/${packageToUpgrade}/upgrade`, {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        await reloadPackages()
        toast.success(data.data?.message || 'Upgrade realizado com sucesso')
        setPackageToUpgrade(null)
      } else {
        toast.error('Erro ao realizar upgrade', {
          description: data.error || 'Não foi possível realizar o upgrade deste pacote.'
        })
      }
    } catch (error) {
      console.error('Erro ao realizar upgrade do pacote:', error)
      toast.error('Erro ao realizar upgrade', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsUpgradingPackage(false)
    }
  }

  const getGenerateBonusesMessage = () => {
    const selectedPackage = user?.packages.find((pkg) => pkg.id === packageToGenerateBonuses)
    const missing: string[] = []
    if (!selectedPackage?.generatedBonuses?.directGenerated) missing.push('direto')
    if (!selectedPackage?.generatedBonuses?.indirectGenerated) missing.push('indireto')
    const missingText = missing.length > 0 ? missing.join(' e ') : 'faltantes'
    return `Deseja gerar o(s) bônus ${missingText} do pacote ${selectedPackage?.name ?? ''}? Esta ação cria as transações de indicação com base na compra relacionada.`
  }

  const getUpgradeMessage = () => {
    const selectedPackage = user?.packages.find((pkg) => pkg.id === packageToUpgrade)
    const upgrade = selectedPackage?.upgrade
    if (!upgrade?.available) {
      return 'Deseja realizar o upgrade deste pacote?'
    }
    const converted = upgrade.rule === 'count' ? (upgrade.upgradeCount ?? 0) * 5 : upgrade.packagesInGroup
    return `Converter ${converted} ${upgrade.sourcePackageName}(s) deste grupo em ${upgrade.upgradeCount} ${upgrade.targetPackageName}(s)? Pacotes gerados pelo admin e pacotes normais são grupos separados.`
  }

  const isPackageToGenerateAdminGenerated = Boolean(
    user?.packages.find((pkg) => pkg.id === packageToGenerateBonuses)?.transactionDescription?.includes(ADMIN_GENERATED_PHRASE)
  )

  const handleOpenChangePackageMiner = (packageId: number) => {
    const selectedPackage = user?.packages.find((pkg) => pkg.id === packageId)
    if (!selectedPackage?.isActive) {
      toast.error('Não é possível alterar a mineradora de pacotes inativos')
      return
    }

    setPackageToChangeMiner(packageId)
  }

  const handleCloseChangePackageMiner = () => {
    if (isChangingPackageMiner) return
    setPackageToChangeMiner(null)
  }

  const handleConfirmChangePackageMiner = async (packageId: number, minerId: number | null) => {
    setIsChangingPackageMiner(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}/packages/${packageId}/miner`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ minerId })
      })

      const data = await response.json()

      if (data.success) {
        await fetchUserDetails()
        toast.success('Mineradora alterada com sucesso', {
          description: data.message
        })
        setPackageToChangeMiner(null)
      } else {
        toast.error('Erro ao alterar mineradora', {
          description: data.error || 'Não foi possível alterar a mineradora do pacote.'
        })
      }
    } catch (error) {
      console.error('Erro ao alterar mineradora do pacote:', error)
      toast.error('Erro ao alterar mineradora', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsChangingPackageMiner(false)
    }
  }

  const handleOpenChangeSponsorModal = async () => {
    // Carregar informações de rede se ainda não foram carregadas
    if (!networkInfoLoaded) {
      setIsLoadingNetworkForSponsor(true)
      try {
        await fetchNetworkInfo()
      } catch (error) {
        console.error('Erro ao carregar informações de rede:', error)
        toast.error('Erro ao carregar informações de rede', {
          description: 'Não foi possível carregar as informações necessárias.'
        })
        setIsLoadingNetworkForSponsor(false)
        return
      }
      setIsLoadingNetworkForSponsor(false)
    }
    setIsChangeSponsorModalOpen(true)
  }

  const handleChangeSponsorConfirm = (newSponsorId: number, newSponsorName: string) => {
    setNewSponsorData({ id: newSponsorId, name: newSponsorName })
    setIsChangeSponsorModalOpen(false)
    setIsConfirmChangeSponsorModalOpen(true)
  }

  const handleFinalChangeSponsorConfirm = async () => {
    if (!newSponsorData) return

    setIsChangingSponsor(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/change-sponsor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSponsorId: newSponsorData.id })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Patrocinador alterado com sucesso', {
          description: `O novo patrocinador é ${newSponsorData.name}`
        })
        setIsConfirmChangeSponsorModalOpen(false)
        setNewSponsorData(null)
        // Recarregar informações do usuário
        fetchUserDetails()
        // Recarregar informações de rede se já foram carregadas
        if (networkInfoLoaded) {
          fetchNetworkInfo()
        }
      } else {
        toast.error('Erro ao alterar patrocinador', {
          description: data.error || 'Não foi possível alterar o patrocinador'
        })
      }
    } catch (error) {
      console.error('Erro ao alterar patrocinador:', error)
      toast.error('Erro ao alterar patrocinador', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsChangingSponsor(false)
    }
  }

  const handleCancelChangeSponsor = () => {
    setIsConfirmChangeSponsorModalOpen(false)
    setNewSponsorData(null)
  }

  const handleOpenEditUserModal = () => {
    if (!user) return
    setEditFormData({
      name: user.name,
      email: user.email
    })
    // Carregar dados de usuário real via API
    fetch(`/api/admin/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const userData = data.data
          setEditCountry(userData.country || 'BR')
          setEditDocumentType((userData.documentType as DocumentType) || DocumentType.CPF)
          setEditDocumentNumber(userData.documentNumber || userData.cpf || '')
          setEditPhoneCountryCode(userData.phoneCountryCode || '+55')
          setEditPhoneNumber(userData.phoneNumber || userData.phone?.replace(/\D/g, '') || '')
        }
      })
      .catch(err => console.error('Erro ao carregar dados do usuário:', err))
    setIsEditUserModalOpen(true)
  }

  const handleEditFormChange = (field: keyof typeof editFormData, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpdateUser = async () => {
    if (!user) return

    setIsUpdatingUser(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          email: editFormData.email,
          country: editCountry,
          documentType: editDocumentType,
          documentNumber: editDocumentNumber.replace(/\D/g, ''),
          phoneCountryCode: editPhoneCountryCode,
          phoneNumber: editPhoneNumber.replace(/\D/g, '')
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Usuário atualizado com sucesso', {
          description: 'Os dados do usuário foram atualizados.'
        })
        setIsEditUserModalOpen(false)
        fetchUserDetails()
      } else {
        toast.error('Erro ao atualizar usuário', {
          description: data.error || 'Não foi possível atualizar o usuário.'
        })
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      toast.error('Erro ao atualizar usuário', {
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      })
    } finally {
      setIsUpdatingUser(false)
    }
  }

  const handleEditCountryChange = (selectedCountry: Country) => {
    setEditCountry(selectedCountry.code)
    setEditPhoneCountryCode(selectedCountry.phoneCode)
    // Resetar documento quando mudar de país
    setEditDocumentType('')
    setEditDocumentNumber('')
  }

  useEffect(() => {
    if (userId) {
      fetchUserDetails()
    }
  }, [fetchUserDetails, userId])

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800'
    }

    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      banned: 'Banido'
    }

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getPackageBadge = (packageName: string | null) => {
    if (!packageName) return <span className="text-gray-400 text-sm">Nenhum</span>

    const styles: Record<string, string> = {
      'AdCentral': 'bg-blue-100 text-blue-800',
      'FAMILY': 'bg-purple-100 text-purple-800',
      'T-BUILD': 'bg-orange-100 text-orange-800',
      'Átomo': 'bg-cyan-100 text-cyan-800',
      'Núcleo': 'bg-indigo-100 text-indigo-800',
      'Tecton': 'bg-amber-100 text-amber-800'
    }

    const style = styles[packageName] || 'bg-gray-100 text-gray-800'

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${style}`}>
        {packageName}
      </span>
    )
  }

  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: 'bg-red-100 text-red-800',
      USER: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles[role as keyof typeof styles]}`}>
        {role}
      </span>
    )
  }

  const getWithdrawalStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONFIRMED: 'bg-blue-100 text-blue-800'
    }

    const labels = {
      PENDING: 'Pendente',
      COMPLETED: 'Concluído',
      REJECTED: 'Rejeitado',
      CONFIRMED: 'Confirmado'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getBonusTypeBadge = (type: string) => {
    const styles = {
      REFERRAL: 'bg-purple-100 text-purple-800',
      DIRECT_BONUS: 'bg-purple-100 text-purple-800',
      INDIRECT_BONUS: 'bg-purple-100 text-purple-800',
      PROFIT_SHARE: 'bg-orange-100 text-orange-800',
      ACTIVATION_BONUS: 'bg-yellow-100 text-yellow-800',
      REACTIVATION_BONUS: 'bg-teal-100 text-teal-800',
      CAREER_BONUS: 'bg-pink-100 text-pink-800',
      TRAVEL_BONUS: 'bg-indigo-100 text-indigo-800'
    }

    const labels = {
      REFERRAL: 'Indicação',
      DIRECT_BONUS: 'Bônus Direto',
      INDIRECT_BONUS: 'Bônus Indireto',
      PROFIT_SHARE: 'Lucro',
      ACTIVATION_BONUS: 'Bônus de Ativação',
      REACTIVATION_BONUS: 'Bônus de Reativação',
      CAREER_BONUS: 'Bônus de Carreira',
      TRAVEL_BONUS: 'Bônus de Viagem'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type as keyof typeof labels] || type}
      </span>
    )
  }

  const getTransactionTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      DEPOSIT: 'bg-blue-100 text-blue-800',
      BONUS: 'bg-green-100 text-green-800',
      WITHDRAWAL: 'bg-red-100 text-red-800',
      PURCHASE: 'bg-purple-100 text-purple-800',
      BONUS_PAYMENT: 'bg-emerald-100 text-emerald-800',
      MINING_REWARD: 'bg-yellow-100 text-yellow-800',
      PIX_PAYMENT: 'bg-cyan-100 text-cyan-800',
      CREDIT_PAYMENT: 'bg-indigo-100 text-indigo-800',
      DIRECT_BONUS: 'bg-purple-100 text-purple-800',
      BOOSTED_BONUS: 'bg-pink-100 text-pink-800',
      INDIRECT_BONUS: 'bg-violet-100 text-violet-800',
      CYCLE_BONUS: 'bg-orange-100 text-orange-800',
      BINARY_BONUS: 'bg-amber-100 text-amber-800',
      PROFIT_SHARE: 'bg-teal-100 text-teal-800',
      ACTIVATION_PIX: 'bg-sky-100 text-sky-800',
      REACTIVATION_BONUS: 'bg-lime-100 text-lime-800',
      BONUS_ADJUSTMENT: 'bg-amber-100 text-amber-800'
    }

    const labels: Record<string, string> = {
      DEPOSIT: 'Depósito',
      BONUS: 'Bônus',
      WITHDRAWAL: 'Saque',
      PURCHASE: 'Compra',
      BONUS_PAYMENT: 'Pagamento de Bônus',
      MINING_REWARD: 'Recompensa de Mineração',
      PIX_PAYMENT: 'Pagamento PIX',
      CREDIT_PAYMENT: 'Pagamento Crédito',
      DIRECT_BONUS: 'Bônus Direto',
      BOOSTED_BONUS: 'Bônus Impulsionado',
      INDIRECT_BONUS: 'Bônus Indireto',
      CYCLE_BONUS: 'Bônus de Ciclo',
      BINARY_BONUS: 'Bônus Binário',
      PROFIT_SHARE: 'Divisão de Lucros',
      ACTIVATION_PIX: 'Ativação PIX',
      REACTIVATION_BONUS: 'Bônus de Reativação',
      BONUS_ADJUSTMENT: 'Bônus de Ajuste'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    )
  }

  const getTransactionTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      DEPOSIT: 'Depósito',
      BONUS: 'Bônus',
      WITHDRAWAL: 'Saque',
      PURCHASE: 'Compra',
      BONUS_PAYMENT: 'Pagamento de Bônus',
      MINING_REWARD: 'Recompensa de Mineração',
      PIX_PAYMENT: 'Pagamento PIX',
      CREDIT_PAYMENT: 'Pagamento Crédito',
      DIRECT_BONUS: 'Bônus Direto',
      BOOSTED_BONUS: 'Bônus Impulsionado',
      INDIRECT_BONUS: 'Bônus Indireto',
      CYCLE_BONUS: 'Bônus de Ciclo',
      BINARY_BONUS: 'Bônus Binário',
      PROFIT_SHARE: 'Divisão de Lucros',
      ACTIVATION_PIX: 'Ativação PIX',
      REACTIVATION_BONUS: 'Bônus de Reativação',
      BONUS_ADJUSTMENT: 'Bônus de Ajuste'
    }
    return labels[type] || type
  }

  const getTransactionStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    }

    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      COMPLETED: 'Concluído',
      REJECTED: 'Rejeitado',
      CONFIRMED: 'Confirmado',
      CANCELLED: 'Cancelado'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return null
    const cleanCpf = cpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) return cpf
    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return null
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }

  const getDocumentTypeLabel = (type?: string | null, countryCode?: string | null) => {
    if (!type) return 'Não informado'
    const documents = getDocumentTypesByCountry(countryCode || 'BR')
    const documentInfo = documents.find(doc => doc.type === type)
    if (documentInfo) {
      return documentInfo.label
    }
    const fallbackLabels: Record<string, string> = {
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
    return fallbackLabels[type] || type
  }

  const getFormattedUserDocument = () => {
    if (!user) return 'Não informado'
    const documentNumber = user.documentNumber || user.cpf
    if (!documentNumber) return 'Não informado'
    const documentType = (user.documentType as DocumentType) || DocumentType.CPF
    return formatInternationalDocument(documentType, documentNumber)
  }

  const getCountryDisplay = () => {
    if (!user || !user.country) return 'Não informado'
    const countryInfo = getCountryByCode(user.country)
    if (countryInfo) {
      return `${countryInfo.flag} ${countryInfo.name}`
    }
    return user.country
  }

  const getFormattedPhone = () => {
    if (!user) return 'Não informado'
    
    // Priorizar phoneNumber com phoneCountryCode
    if (user.phoneNumber) {
      const code = user.phoneCountryCode || '+55'
      const number = user.phoneNumber
      
      // Formatação básica brasileira
      if (code === '+55') {
        const cleanNumber = number.replace(/\D/g, '')
        if (cleanNumber.length === 11) {
          return `${code} (${cleanNumber.slice(0, 2)}) ${cleanNumber.slice(2, 7)}-${cleanNumber.slice(7)}`
        } else if (cleanNumber.length === 10) {
          return `${code} (${cleanNumber.slice(0, 2)}) ${cleanNumber.slice(2, 6)}-${cleanNumber.slice(6)}`
        }
      }
      
      return `${code} ${number}`
    }
    
    // Fallback para phone antigo
    if (user.phone) {
      return formatPhone(user.phone)
    }
    
    return 'Não informado'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando usuário...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Usuário não encontrado</p>
          <button
            onClick={() => router.push('/admin/usuarios')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para Lista
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/admin/usuarios')}
                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
                aria-label="Voltar para lista de usuários"
                tabIndex={0}
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Voltar</span>
              </button>
              <div className="h-4 sm:h-6 w-px bg-gray-300 flex-shrink-0"></div>
              <h1 className="text-sm sm:text-lg md:text-xl font-semibold text-gray-900 truncate">Detalhes do Usuário</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-8">
        {/* Informações Principais */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-8">
          {/* Foto do Perfil */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="flex-shrink-0">
              {user.photoUrl ? (
                <button
                  onClick={() => setIsPhotoViewModalOpen(true)}
                  className="group relative rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all hover:opacity-90"
                  aria-label="Ver foto em tamanho maior"
                  tabIndex={0}
                >
                  <Image
                    src={user.photoUrl}
                    alt={user.name}
                    width={96}
                    height={96}
                    className="h-20 w-20 md:h-24 md:w-24 rounded-full object-cover border-4 border-blue-100 cursor-pointer"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="w-0 h-0 group-hover:w-6 group-hover:h-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </button>
              ) : (
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-4 border-blue-100">
                  <User className="h-10 w-10 md:h-12 md:w-12 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 break-words">{user.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-200">
            <button
              onClick={handleOpenEditUserModal}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
              aria-label="Editar dados do usuário"
              tabIndex={0}
            >
              <Edit className="w-4 h-4 flex-shrink-0" />
              <span>Editar Dados</span>
            </button>
            
            <button
              onClick={handleOpenUserStatusModal}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
                user.isActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              aria-label={user.isActive ? 'Banir usuário' : 'Ativar usuário'}
              tabIndex={0}
            >
              {user.isActive ? (
                <>
                  <Ban className="w-4 h-4 flex-shrink-0" />
                  <span>Banir Usuário</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 flex-shrink-0" />
                  <span>Ativar Usuário</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setGeneratedResetLink(null)
                setIsPasswordResetModalOpen(true)
              }}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
              aria-label="Recriar senha"
              tabIndex={0}
            >
              <LinkIcon className="w-4 h-4 flex-shrink-0" />
              <span>Recriar senha</span>
            </button>

            <button
              onClick={() => {
                setGeneratedFinancialResetLink(null)
                setIsFinancialPasswordResetModalOpen(true)
              }}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700"
              aria-label="Recriar senha financeira"
              tabIndex={0}
            >
              <LinkIcon className="w-4 h-4 flex-shrink-0" />
              <span>Recriar senha financeira</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Informações Básicas */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">Email</p>
                      <p className="font-medium text-sm md:text-base break-all">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">País</p>
                      <p className="font-medium text-sm md:text-base">
                        {getCountryDisplay()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <IdCard className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">
                        {getDocumentTypeLabel(user.documentType, user.country)}
                      </p>
                      <p className="font-medium text-sm md:text-base">
                        {getFormattedUserDocument()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">Telefone</p>
                      <p className="font-medium text-sm md:text-base">
                        {getFormattedPhone()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">Cadastrado em</p>
                      <p className="font-medium text-sm md:text-base">{formatDate(user.registeredAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">Código de Indicação</p>
                      <p className="font-medium text-sm md:text-base">{user.referralCode}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">Pacote Ativo</p>
                      <div className="mt-1">{getPackageBadge(user.package)}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">Status</p>
                      <div className="mt-1">{getStatusBadge(user.status)}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Award className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-500">Função</p>
                      <div className="mt-1">{getRoleBadge(user.role)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas - Apenas visível para SUPER_ADMIN */}
            {isSuperAdmin() && (
              <div className="space-y-3 md:space-y-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 md:p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm opacity-90">Saldo Atual</p>
                      <p className="text-lg md:text-2xl font-bold truncate">{formatCurrency(user.balance)}</p>
                    </div>
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 opacity-90 flex-shrink-0 ml-2" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-3 md:p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm opacity-90">Total Ganho</p>
                      <p className="text-lg md:text-2xl font-bold truncate">{formatCurrency(user.totalEarnings)}</p>
                    </div>
                    <TrendingUp className="w-6 h-6 md:w-8 md:h-8 opacity-90 flex-shrink-0 ml-2" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-3 md:p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm opacity-90">Indicações</p>
                      <p className="text-lg md:text-2xl font-bold truncate">{user.referrals}</p>
                    </div>
                    <Users className="w-6 h-6 md:w-8 md:h-8 opacity-90 flex-shrink-0 ml-2" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 md:mb-8">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex flex-nowrap min-w-max px-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('pacotes')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'pacotes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4 inline-block mr-2" />
                Pacotes
              </button>
              <button
                onClick={() => setActiveTab('bonus')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'bonus'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Award className="w-4 h-4 inline-block mr-2" />
                Bônus
              </button>
              <button
                onClick={() => setActiveTab('saques')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'saques'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-4 h-4 inline-block mr-2" />
                Saques
              </button>
              <button
                onClick={() => setActiveTab('ativacoes')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'ativacoes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-4 h-4 inline-block mr-2" />
                Ativações
              </button>
              <button
                onClick={() => setActiveTab('contratos')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'contratos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline-block mr-2" />
                Contratos
              </button>
              <button
                onClick={() => setActiveTab('lucros')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'lucros'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-4 h-4 inline-block mr-2" />
                Lucros
              </button>
              <button
                onClick={() => setActiveTab('pix')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'pix'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-4 h-4 inline-block mr-2" />
                Chave PIX
              </button>
              <button
                onClick={() => setActiveTab('transacoes')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'transacoes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline-block mr-2" />
                Transações
              </button>
              <button
                onClick={() => setActiveTab('pontos')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'pontos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline-block mr-2" />
                Pontos
              </button>
              <button
                onClick={() => setActiveTab('carreira')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'carreira'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Award className="w-4 h-4 inline-block mr-2" />
                Carreira
              </button>
              <button
                onClick={() => setActiveTab('permissoes')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'permissoes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserCheck className="w-4 h-4 inline-block mr-2" />
                Permissões
              </button>
              <button
                onClick={() => setActiveTab('rede')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'rede'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline-block mr-2" />
                Rede
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {/* Pacotes Tab */}
            {activeTab === 'pacotes' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Pacotes Adquiridos ({(() => {
                // Aplicar filtros
                const filtered = user.packages.filter(pkg => {
                  // Filtro de status
                  if (packageFilter === 'active' && !pkg.isActive) return false
                  if (packageFilter === 'inactive' && pkg.isActive) return false
                  
                  // Filtro de tipo
                  if (packageTypeFilter !== 'all' && pkg.name !== packageTypeFilter) return false
                  
                  // Filtro de data
                  if (packageDateStart || packageDateEnd) {
                    const packageDate = new Date(pkg.activatedAt)
                    packageDate.setHours(0, 0, 0, 0)
                    
                    if (packageDateStart) {
                      const startDate = new Date(packageDateStart)
                      startDate.setHours(0, 0, 0, 0)
                      if (packageDate < startDate) return false
                    }
                    
                    if (packageDateEnd) {
                      const endDate = new Date(packageDateEnd)
                      endDate.setHours(23, 59, 59, 999)
                      if (packageDate > endDate) return false
                    }
                  }
                  
                  return true
                })
                
                return filtered.length
              })()})
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Filtro de Status */}
                <select
                  value={packageFilter}
                  onChange={(e) => setPackageFilter(e.target.value as 'active' | 'inactive' | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="active">Pacotes Ativos</option>
                  <option value="inactive">Pacotes Inativos</option>
                  <option value="all">Todos os Pacotes</option>
                </select>
                {/* Filtro de Tipo de Pacote */}
                <select
                  value={packageTypeFilter}
                  onChange={(e) => setPackageTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="all">Todos os Tipos</option>
                  {Array.from(new Set(user.packages.map(pkg => pkg.name)))
                    .sort()
                    .map((packageName) => (
                      <option key={packageName} value={packageName}>
                        {packageName}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => setIsGeneratePackageModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm md:text-base"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Adicionar Pacote</span>
                </button>
                <button
                  onClick={reloadPackages}
                  disabled={isReloadingPackages}
                  className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm md:text-base disabled:opacity-50"
                  title="Recarregar lista de pacotes"
                  aria-label="Recarregar lista de pacotes"
                  tabIndex={0}
                >
                  <RefreshCw className={`w-4 h-4 flex-shrink-0 ${isReloadingPackages ? 'animate-spin' : ''}`} />
                  <span>Recarregar</span>
                </button>
              </div>
              {/* Filtro de Período */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="text-sm text-gray-600 font-medium sm:hidden">Período de Criação</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="flex-1">
                    <label htmlFor="package-date-start" className="block text-xs text-gray-500 mb-1 sm:hidden">
                      Data Início
                    </label>
                    <input
                      id="package-date-start"
                      type="date"
                      value={packageDateStart}
                      onChange={(e) => setPackageDateStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      placeholder="Data início"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="package-date-end" className="block text-xs text-gray-500 mb-1 sm:hidden">
                      Data Fim
                    </label>
                    <input
                      id="package-date-end"
                      type="date"
                      value={packageDateEnd}
                      onChange={(e) => setPackageDateEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      placeholder="Data fim"
                    />
                  </div>
                  {(packageDateStart || packageDateEnd) && (
                    <button
                      onClick={() => {
                        setPackageDateStart('')
                        setPackageDateEnd('')
                      }}
                      className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                      title="Limpar filtro de data"
                    >
                      Limpar Data
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {(() => {
              // Aplicar filtros nos pacotes
              const filteredPackages = user.packages.filter(pkg => {
                // Filtro de status
                if (packageFilter === 'active' && !pkg.isActive) return false
                if (packageFilter === 'inactive' && pkg.isActive) return false
                
                // Filtro de tipo
                if (packageTypeFilter !== 'all' && pkg.name !== packageTypeFilter) return false
                
                // Filtro de data
                if (packageDateStart || packageDateEnd) {
                  const packageDate = new Date(pkg.activatedAt)
                  packageDate.setHours(0, 0, 0, 0)
                  
                  if (packageDateStart) {
                    const startDate = new Date(packageDateStart)
                    startDate.setHours(0, 0, 0, 0)
                    if (packageDate < startDate) return false
                  }
                  
                  if (packageDateEnd) {
                    const endDate = new Date(packageDateEnd)
                    endDate.setHours(23, 59, 59, 999)
                    if (packageDate > endDate) return false
                  }
                }
                
                return true
              })

              return filteredPackages.length > 0 ? (
                filteredPackages.map((pkg) => (
                <div key={pkg.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 ${pkg.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base truncate">{pkg.name}</p>
                      <p className="text-xs md:text-sm text-gray-500 truncate">
                        Ativado em {formatDate(pkg.activatedAt)}
                      </p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                          Mineradora: {pkg.minerName ?? 'Não vinculada'}
                        </p>
                        {hasPermission('packages.change_miner') && pkg.isActive && (
                          <button
                            onClick={() => handleOpenChangePackageMiner(pkg.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                            title="Alterar mineradora"
                            aria-label="Alterar mineradora do pacote"
                            tabIndex={0}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className={`text-xs md:text-sm truncate ${pkg.excludeFromPointsCalculation ? 'text-orange-600' : 'text-green-600'}`}>
                        Pontuação na rede: {pkg.excludeFromPointsCalculation ? 'Não calcula' : 'Calcula'}
                      </p>
                      {pkg.transactionDescription && (
                        <p className="text-xs md:text-sm text-gray-500 truncate" title={pkg.transactionDescription}>
                          Transação: {renderTransactionDescription(pkg.transactionDescription)}
                        </p>
                      )}
                      <p className="text-xs md:text-sm text-gray-500">
                        <span className="text-gray-400" title="Os valores são da compra inteira, não deste pacote isolado">
                          Desta compra
                          {(pkg.generatedBonuses?.purchasePackageCount ?? 1) > 1
                            ? ` (${pkg.generatedBonuses?.purchasePackageCount} pacotes)`
                            : ''}
                          :{' '}
                        </span>
                        <span title="Transação DIRECT_BONUS da mesma compra (correlationID)">
                          Direto gerado:{' '}
                          {renderGeneratedBonusStatus(
                            pkg.generatedBonuses?.identifiable ?? false,
                            pkg.generatedBonuses?.directGenerated ?? false,
                            pkg.generatedBonuses?.directAmount ?? 0
                          )}
                        </span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span title="Transações INDIRECT_BONUS da mesma compra (correlationID)">
                          Indireto gerado:{' '}
                          {renderGeneratedBonusStatus(
                            pkg.generatedBonuses?.identifiable ?? false,
                            pkg.generatedBonuses?.indirectGenerated ?? false,
                            pkg.generatedBonuses?.indirectAmount ?? 0,
                            pkg.generatedBonuses?.indirectGenerated && pkg.generatedBonuses.indirectCount > 0
                              ? `(${pkg.generatedBonuses.indirectCount})`
                              : undefined
                          )}
                        </span>
                      </p>
                      {canCreateBonus &&
                        (pkg.generatedBonuses?.identifiable ?? false) &&
                        (!(pkg.generatedBonuses?.directGenerated ?? false) || !(pkg.generatedBonuses?.indirectGenerated ?? false)) && (
                          <button
                            onClick={() => handleOpenGenerateBonuses(pkg.id)}
                            className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                            title="Gerar bônus de indicação direto e/ou indireto que ainda não foram pagos"
                            aria-label="Gerar bônus de indicação"
                            tabIndex={0}
                          >
                            <Gift className="w-3.5 h-3.5" />
                            Gerar Bônus
                          </button>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4">
                    <div className="text-left sm:text-right space-y-1">
                      <div>
                        <p className="text-[11px] md:text-xs text-gray-500">Valor do pacote</p>
                        <p className="font-semibold text-sm md:text-base">{formatCurrency(pkg.price)}</p>
                      </div>
                      <p className="text-xs md:text-sm text-gray-500">
                        {pkg.isActive ? 'Ativo' : 'Inativo'}
                      </p>
                    </div>
                    {canUpgradePackages && pkg.isActive && pkg.upgrade?.available && (
                      <button
                        onClick={() => handleOpenUpgradePackage(pkg.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors flex-shrink-0"
                        title={`Fazer upgrade para ${pkg.upgrade.targetPackageName}`}
                        aria-label={`Fazer upgrade para ${pkg.upgrade.targetPackageName}`}
                        tabIndex={0}
                      >
                        <CircleArrowUp className="w-3.5 h-3.5" />
                        Upgrade → {pkg.upgrade.targetPackageName}
                      </button>
                    )}
                    {(canActivatePackages || canDeletePackages) && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Botão Ativar/Desativar */}
                        {canActivatePackages && (
                        <button
                          onClick={() => handleTogglePackage(pkg.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            pkg.isActive 
                              ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50' 
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          }`}
                          title={pkg.isActive ? 'Desativar pacote' : 'Ativar pacote'}
                          aria-label={pkg.isActive ? 'Desativar pacote' : 'Ativar pacote'}
                          tabIndex={0}
                        >
                          {pkg.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        )}

                        {/* Botão Excluir (apenas se criado há menos de 1 hora) */}
                        {canDeletePackages && pkg.canDelete && (
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir pacote"
                            aria-label="Excluir pacote"
                            tabIndex={0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 md:py-8">
                <Package className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">
                  {(() => {
                    const hasDateFilter = packageDateStart || packageDateEnd
                    const dateFilterText = hasDateFilter 
                      ? ` no período ${packageDateStart ? `de ${new Date(packageDateStart).toLocaleDateString('pt-BR')}` : ''}${packageDateStart && packageDateEnd ? ' ' : ''}${packageDateEnd ? `até ${new Date(packageDateEnd).toLocaleDateString('pt-BR')}` : ''}`
                      : ''
                    
                    if (packageFilter === 'active' && packageTypeFilter !== 'all' && hasDateFilter) {
                      return `Nenhum pacote ativo do tipo ${packageTypeFilter}${dateFilterText}`
                    }
                    if (packageFilter === 'inactive' && packageTypeFilter !== 'all' && hasDateFilter) {
                      return `Nenhum pacote inativo do tipo ${packageTypeFilter}${dateFilterText}`
                    }
                    if (packageFilter === 'active' && packageTypeFilter !== 'all') {
                      return `Nenhum pacote ativo do tipo ${packageTypeFilter}`
                    }
                    if (packageFilter === 'inactive' && packageTypeFilter !== 'all') {
                      return `Nenhum pacote inativo do tipo ${packageTypeFilter}`
                    }
                    if (packageFilter === 'active' && hasDateFilter) {
                      return `Nenhum pacote ativo${dateFilterText}`
                    }
                    if (packageFilter === 'inactive' && hasDateFilter) {
                      return `Nenhum pacote inativo${dateFilterText}`
                    }
                    if (packageFilter === 'active') {
                      return 'Nenhum pacote ativo'
                    }
                    if (packageFilter === 'inactive') {
                      return 'Nenhum pacote inativo'
                    }
                    if (packageTypeFilter !== 'all' && hasDateFilter) {
                      return `Nenhum pacote do tipo ${packageTypeFilter}${dateFilterText}`
                    }
                    if (packageTypeFilter !== 'all') {
                      return `Nenhum pacote do tipo ${packageTypeFilter}`
                    }
                    if (hasDateFilter) {
                      return `Nenhum pacote adquirido${dateFilterText}`
                    }
                    return 'Nenhum pacote adquirido'
                  })()}
                </p>
              </div>
            )
            })()}
          </div>
              </div>
            )}

            {/* Bônus Tab */}
            {activeTab === 'bonus' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Bônus Recebidos</h3>
            <button
              onClick={fetchBonuses}
              disabled={bonusesLoading}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm md:text-base"
            >
              {bonusesLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <Eye className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{bonusesLoading ? 'Carregando...' : bonusesLoaded ? 'Recarregar' : 'Carregar'}</span>
            </button>
          </div>

          {bonusesLoaded ? (
            bonuses.length > 0 ? (
              <>
                {/* Versão Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bonuses.map((bonus) => (
                        <tr key={bonus.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {getBonusTypeBadge(bonus.type)}
                          </td>
                          <td className="px-4 py-3 font-medium text-green-600">
                            {formatCurrency(bonus.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {bonus.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(bonus.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Versão Mobile */}
                <div className="md:hidden space-y-3">
                  {bonuses.map((bonus) => (
                    <div key={bonus.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {getBonusTypeBadge(bonus.type)}
                        <span className="font-semibold text-green-600 text-sm">{formatCurrency(bonus.amount)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{bonus.description}</p>
                      <p className="text-xs text-gray-400">{formatDate(bonus.createdAt)}</p>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    Página {bonusesMeta?.page || bonusesPage} de {bonusesMeta?.totalPages || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBonusesPrev}
                      disabled={!bonusesMeta?.hasPrevPage}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={handleBonusesNext}
                      disabled={!bonusesMeta?.hasNextPage}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 md:py-8">
                <Award className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">Nenhum bônus registrado</p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <Award className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar Bônus&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Saques Tab */}
            {activeTab === 'saques' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Saques Solicitados</h3>
            <button
              onClick={fetchWithdrawals}
              disabled={withdrawalsLoading}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm md:text-base"
            >
              {withdrawalsLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <CreditCard className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{withdrawalsLoading ? 'Carregando...' : withdrawalsLoaded ? 'Recarregar' : 'Carregar'}</span>
            </button>
          </div>

          {withdrawalsLoaded ? (
            withdrawals.length > 0 ? (
              <>
                {/* Versão Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitado em</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatCurrency(withdrawal.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {getWithdrawalStatusBadge(withdrawal.status)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {withdrawal.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(withdrawal.requestedAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {withdrawal.processedAt ? formatDate(withdrawal.processedAt) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Versão Mobile */}
                <div className="lg:hidden space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-semibold text-gray-900 text-sm">{formatCurrency(withdrawal.amount)}</span>
                        {getWithdrawalStatusBadge(withdrawal.status)}
                      </div>
                      {withdrawal.description && (
                        <p className="text-xs text-gray-600 mb-2">{withdrawal.description}</p>
                      )}
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>Solicitado: {formatDate(withdrawal.requestedAt)}</p>
                        {withdrawal.processedAt && (
                          <p>Processado: {formatDate(withdrawal.processedAt)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 md:py-8">
                <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">Nenhum saque solicitado</p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar Saques&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Ativações Tab */}
            {activeTab === 'ativacoes' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Histórico de Ativações</h3>
            <button
              onClick={fetchActivations}
              disabled={activationsLoading}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm md:text-base"
            >
              {activationsLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{activationsLoading ? 'Carregando...' : activationsLoaded ? 'Recarregar' : 'Carregar'}</span>
            </button>
          </div>

          {activationsLoaded ? (
            activations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bônus Usado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ativado em</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activations.map((activation) => (
                      <tr key={activation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${activation.type === 'PIX' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                            {activation.type === 'PIX' ? 'PIX' : 'Bônus'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(activation.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {activation.bonusUsed ? formatCurrency(activation.bonusUsed) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${activation.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              activation.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {activation.status === 'ACTIVE' ? 'Ativa' :
                              activation.status === 'EXPIRED' ? 'Expirada' : 'Cancelada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(activation.activatedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(activation.expiresAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <Clock className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">Nenhuma ativação registrada</p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <Clock className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar Ativações&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Contratos Tab */}
            {activeTab === 'contratos' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Contratos Assinados</h3>
            <button
              onClick={fetchContracts}
              disabled={contractsLoading}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm md:text-base"
            >
              {contractsLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{contractsLoading ? 'Carregando...' : contractsLoaded ? 'Recarregar' : 'Carregar'}</span>
            </button>
          </div>

          {contractsLoaded ? (
            contracts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pacote</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versão</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assinado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{contract.title}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{contract.package?.name || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {contract.version}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'SIGNED' ? 'bg-green-100 text-green-800' :
                              contract.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {contract.status === 'SIGNED' ? 'Assinado' :
                              contract.status === 'PENDING' ? 'Pendente' : 'Expirado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {contract.signedAt ? formatDate(contract.signedAt) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <FileText className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">Nenhum contrato assinado</p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <FileText className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar Contratos&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Distribuição de Lucros Tab */}
            {activeTab === 'lucros' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Distribuição de Lucros</h3>
            <button
              onClick={fetchProfitDistributions}
              disabled={profitDistributionsLoading}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm md:text-base"
            >
              {profitDistributionsLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <DollarSign className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{profitDistributionsLoading ? 'Carregando...' : profitDistributionsLoaded ? 'Recarregar' : 'Carregar'}</span>
            </button>
          </div>

          {profitDistributionsLoaded ? (
            profitDistributions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pacote</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentual</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {profitDistributions.map((distribution) => (
                      <tr key={distribution.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium">{distribution.package.name}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-green-600">
                          {formatCurrency(distribution.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {distribution.profitPercent}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div>{formatDate(distribution.periodStart)}</div>
                          <div>até {formatDate(distribution.periodEnd)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${distribution.status === 'PROCESSED' ? 'bg-green-100 text-green-800' :
                              distribution.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {distribution.status === 'PROCESSED' ? 'Processado' :
                              distribution.status === 'PENDING' ? 'Pendente' : 'Falhou'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <DollarSign className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">Nenhuma distribuição de lucro registrada</p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <DollarSign className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar Distribuições&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Chave PIX Tab */}
            {activeTab === 'pix' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Chave PIX</h3>
            <button
              onClick={fetchPixKey}
              disabled={pixKeyLoading}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 text-sm md:text-base"
            >
              {pixKeyLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <CreditCard className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{pixKeyLoading ? 'Carregando...' : pixKeyLoaded ? 'Recarregar' : 'Carregar'}</span>
            </button>
          </div>

          {pixKeyLoaded ? (
            pixKey ? (
              <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tipo de Chave</p>
                    <p className="font-medium">{pixKey.pixKeyType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Chave PIX</p>
                    <p className="font-medium">{pixKey.pixKey}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Nome do Titular</p>
                    <p className="font-medium">{pixKey.accountHolderName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Banco</p>
                    <p className="font-medium">{pixKey.bankName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Cadastrado em</p>
                    <p className="font-medium">{formatDate(pixKey.createdAt)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">Nenhuma chave PIX cadastrada</p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar PIX&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Transações Financeiras Tab */}
            {activeTab === 'transacoes' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Transações Financeiras</h3>
            <div className="flex items-center gap-2">
              {isSuperAdmin() && (
                <>
                  <button
                    onClick={handleFixDirectBonus}
                    disabled={fixingDirectBonus}
                    className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm md:text-base"
                  >
                    <RefreshCw className={`w-4 h-4 flex-shrink-0 ${fixingDirectBonus ? 'animate-spin' : ''}`} />
                    <span className="truncate">{fixingDirectBonus ? 'Corrigindo...' : 'Corrigir Bônus Direto'}</span>
                  </button>
                  <button
                    onClick={() => setIsAddFinancialTransactionModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Adicionar</span>
                  </button>
                </>
              )}
              <button
                onClick={fetchFinancialTransactions}
                disabled={financialTransactionsLoading}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm md:text-base"
              >
                {financialTransactionsLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{financialTransactionsLoading ? 'Carregando...' : financialTransactionsLoaded ? 'Recarregar' : 'Carregar'}</span>
              </button>
            </div>
          </div>

          {/* Filtros */}
          {financialTransactionsLoaded && financialTransactions.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro por Tipo de Transação */}
                <div>
                  <label htmlFor="transaction-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Transação
                  </label>
                  <select
                    id="transaction-type-filter"
                    value={selectedTransactionType}
                    onChange={(e) => setSelectedTransactionType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="all">Todos os tipos</option>
                    {financialTransactionTypes.map((type) => (
                      <option key={type} value={type}>
                        {getTransactionTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Origem */}
                <div>
                  <label htmlFor="transaction-origin-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Origem da Transação
                  </label>
                  <select
                    id="transaction-origin-filter"
                    value={selectedTransactionOrigin}
                    onChange={(e) => setSelectedTransactionOrigin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="all">Todas as transações</option>
                    <option value="received">Bônus recebidos</option>
                    <option value="generated">Bônus que gerou</option>
                  </select>
                </div>

                {/* Filtro por Nome (Gerado por / Recebido por) */}
                <div>
                  <label htmlFor="transaction-name-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar por Nome
                  </label>
                  <input
                    id="transaction-name-filter"
                    type="text"
                    value={transactionNameFilter}
                    onChange={(e) => setTransactionNameFilter(e.target.value)}
                    placeholder="Gerado por ou Recebido por..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Contador de resultados */}
              <div className="mt-3 text-sm text-gray-600">
                Exibindo <span className="font-semibold">{financialTransactionsFiltered.length}</span> de <span className="font-semibold">{financialTransactions.length}</span> transações
              </div>
            </div>
          )}

          {financialTransactionsLoaded ? (
            financialTransactionsFiltered.length > 0 ? (
              <>
                {/* Valor Total das Transações Filtradas */}
                <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm text-gray-600">Valor Total das Transações Listadas</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatCurrency(
                          financialTransactionsFiltered.reduce((total, transaction) => total + transaction.amount, 0)
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {financialTransactionsFiltered.length} {financialTransactionsFiltered.length === 1 ? 'transação' : 'transações'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Versão Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        {isSuperAdmin() && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {financialTransactionsFiltered.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {transaction.id}
                          </td>
                          <td className="px-4 py-3">
                            {getTransactionTypeBadge(transaction.type)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {transaction.description || '-'}
                            {transaction.level && (
                              <span className="ml-2 text-xs text-gray-500">(Nível {transaction.level})</span>
                            )}
                            {transaction.isGenerated && transaction.receiverName && transaction.userId && (
                              <div className="text-xs text-blue-600 mt-1">
                                → Recebido por:{' '}
                                <Link
                                  href={`/admin/usuarios/${transaction.userId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold hover:underline cursor-pointer"
                                >
                                  {transaction.receiverName}
                                </Link>
                              </div>
                            )}
                            {transaction.isReceived && transaction.sourceName && transaction.sourceUserId && (
                              <div className="text-xs text-green-600 mt-1">
                                ← Gerado por:{' '}
                                <Link
                                  href={`/admin/usuarios/${transaction.sourceUserId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold hover:underline cursor-pointer"
                                >
                                  {transaction.sourceName}
                                </Link>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-green-600">
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {getTransactionStatusBadge(transaction.status)}
                          </td>
                          <td className="px-4 py-3">
                            {transaction.isReceived && transaction.isGenerated ? (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Ambos</span>
                            ) : transaction.isReceived ? (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Recebido</span>
                            ) : transaction.isGenerated ? (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Gerado</span>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {isSuperAdmin() && canDeleteTransaction(transaction.createdAt) && (
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-lg hover:bg-red-50"
                                title="Excluir transação (válido por 24h)"
                                tabIndex={0}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Versão Mobile */}
                <div className="lg:hidden space-y-3">
                  {financialTransactionsFiltered.map((transaction) => (
                    <div key={transaction.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {getTransactionTypeBadge(transaction.type)}
                        <span className="font-semibold text-green-600 text-sm">{formatCurrency(transaction.amount)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {transaction.description || '-'}
                        {transaction.level && (
                          <span className="ml-2 text-xs text-gray-500">(Nível {transaction.level})</span>
                        )}
                      </p>
                      {transaction.isGenerated && transaction.receiverName && transaction.userId && (
                        <p className="text-xs text-blue-600 mb-2">
                          → Recebido por:{' '}
                          <Link
                            href={`/admin/usuarios/${transaction.userId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold hover:underline cursor-pointer"
                          >
                            {transaction.receiverName}
                          </Link>
                        </p>
                      )}
                      {transaction.isReceived && transaction.sourceName && transaction.sourceUserId && (
                        <p className="text-xs text-green-600 mb-2">
                          ← Gerado por:{' '}
                          <Link
                            href={`/admin/usuarios/${transaction.sourceUserId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold hover:underline cursor-pointer"
                          >
                            {transaction.sourceName}
                          </Link>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        {getTransactionStatusBadge(transaction.status)}
                        {transaction.isReceived && transaction.isGenerated ? (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Ambos</span>
                        ) : transaction.isReceived ? (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Recebido</span>
                        ) : transaction.isGenerated ? (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Gerado</span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{formatDate(transaction.createdAt)}</p>
                        {isSuperAdmin() && canDeleteTransaction(transaction.createdAt) && (
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50 flex items-center gap-1"
                            title="Excluir transação (válido por 24h)"
                            tabIndex={0}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-xs">Excluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 md:py-8">
                <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">
                  {financialTransactions.length > 0 
                    ? 'Nenhuma transação encontrada com os filtros aplicados'
                    : 'Nenhuma transação financeira registrada'}
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <TrendingUp className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar Transações&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Histórico de Pontos da Rede Tab */}
            {activeTab === 'pontos' && (
              <div>
                <NetworkPointsHistory userId={userId} autoFetch={false} title="Histórico de Pontos da Rede" />
              </div>
            )}

            {/* Níveis de Carreira Tab */}
            {activeTab === 'carreira' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Níveis de Carreira Unilevel</h3>
            <button
              onClick={fetchCareerInfo}
              disabled={careerInfoLoading}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm md:text-base"
            >
              {careerInfoLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <Award className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{careerInfoLoading ? 'Carregando...' : careerInfoLoaded ? 'Recarregar' : 'Carregar'}</span>
            </button>
          </div>

          {careerInfoLoaded ? (
            careerInfo ? (
              <div className="space-y-6">
                {/* Nível Atual */}
                {careerInfo.currentLevel ? (
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 md:p-6 border-2 border-amber-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <h4 className="text-lg md:text-xl font-bold text-amber-900 flex items-center gap-2">
                        <Award className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Nível Atual: {careerInfo.currentLevel.levelName}</span>
                      </h4>
                      <span className={`px-3 py-1 text-xs md:text-sm font-semibold rounded-full self-start sm:self-auto ${
                        careerInfo.currentLevel.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {careerInfo.currentLevel.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600">Pontos Próprios</p>
                        <p className="text-2xl font-bold text-amber-600">{careerInfo.currentLevel.ownPoints.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600">Pontos da Rede</p>
                        <p className="text-2xl font-bold text-blue-600">{careerInfo.currentLevel.networkPoints.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total de Pontos</p>
                        <p className="text-2xl font-bold text-purple-600">{careerInfo.currentLevel.totalPoints.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600">Volume da Equipe</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(careerInfo.currentLevel.teamVolume)}</p>
                      </div>
                    </div>

                    {careerInfo.currentLevel.benefits && (
                      <div className="bg-white rounded-lg p-4">
                        <h5 className="font-semibold text-amber-900 mb-3">Benefícios do Nível</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Pontos Necessários</p>
                            <p className="font-medium">{careerInfo.currentLevel.benefits.requiredPoints.toLocaleString()} pontos/mês</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Limite VME</p>
                            <p className="font-medium">{careerInfo.currentLevel.benefits.maxTeamVolumePercent}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Diretos Necessários</p>
                            <p className="font-medium">{careerInfo.currentLevel.benefits.requiredDirects || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Níveis de Bônus Indireto</p>
                            <p className="font-medium">{careerInfo.currentLevel.benefits.indirectBonusLevels} níveis</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Níveis de Reativação</p>
                            <p className="font-medium">{careerInfo.currentLevel.benefits.reactivationLevels} níveis</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Lucro Extra</p>
                            <p className="font-medium">{careerInfo.currentLevel.benefits.extraProfitPercent}%</p>
                          </div>
                          {careerInfo.currentLevel.benefits.travelBonus && (
                            <div className="md:col-span-3">
                              <p className="text-gray-600">Prêmio de Viagem</p>
                              <p className="font-medium text-green-600">
                                {careerInfo.currentLevel.benefits.travelBonus}
                                {careerInfo.currentLevel.benefits.travelValue && 
                                  ` - ${formatCurrency(careerInfo.currentLevel.benefits.travelValue)}`}
                              </p>
                            </div>
                          )}
                          {careerInfo.currentLevel.benefits.careerPrizeDescription && (
                            <div className="md:col-span-3">
                              <p className="text-gray-600">Prêmio de Carreira</p>
                              <p className="font-medium text-purple-600">
                                {careerInfo.currentLevel.benefits.careerPrizeDescription}
                                {careerInfo.currentLevel.benefits.careerPrizeValue && 
                                  ` - ${formatCurrency(careerInfo.currentLevel.benefits.careerPrizeValue)}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Última atualização: {formatDate(careerInfo.currentLevel.lastUpdated)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Usuário ainda não está no sistema Unilevel</p>
                  </div>
                )}

                {/* Histórico de Progressão */}
                {careerInfo.history.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Histórico de Progressão</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nível</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pontos Totais</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pontos Válidos</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benefícios</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Graduado em</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {careerInfo.history.map((career) => (
                            <tr key={career.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className="font-semibold text-amber-600">{career.levelName}</span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {career.totalNetworkPoints.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {career.validPoints.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <div className="space-y-1">
                                  <div>Bônus Indireto: {career.benefits.indirectBonusLevels} níveis</div>
                                  <div>Reativação: {career.benefits.reactivationLevels} níveis</div>
                                  {career.benefits.extraProfitPercent > 0 && (
                                    <div className="text-green-600">Lucro Extra: +{career.benefits.extraProfitPercent}%</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {formatDate(career.graduatedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Todos os Níveis Disponíveis */}
                {careerInfo.allLevels.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Níveis Disponíveis no Sistema</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {careerInfo.allLevels.map((level) => (
                        <div 
                          key={level.id} 
                          className={`p-4 rounded-lg border-2 ${
                            careerInfo.currentLevel?.levelId === level.id
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-gray-900">{level.name}</h5>
                            {careerInfo.currentLevel?.levelId === level.id && (
                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">Atual</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>📊 {level.requiredPoints.toLocaleString()} pts/mês</div>
                            <div>👥 {level.requiredDirects} diretos</div>
                            <div>🎯 VME: {level.maxTeamVolumePercent}%</div>
                            <div>💰 {level.indirectBonusLevels} níveis indiretos</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Erro ao carregar informações de carreira</p>
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Clique em &quot;Carregar Carreira&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}

            {/* Roles & Permissões Tab */}
            {activeTab === 'permissoes' && (
              <div>
                <UserRolesPermissions userId={userId} />
              </div>
            )}

            {/* Informações de Rede Tab */}
            {activeTab === 'rede' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Informações de Rede</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleOpenChangeSponsorModal}
                disabled={isLoadingNetworkForSponsor}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm md:text-base"
                tabIndex={0}
              >
                {isLoadingNetworkForSponsor ? (
                  <>
                    <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
                    <span className="truncate">Carregando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Trocar Rede</span>
                  </>
                )}
              </button>
              <button
                onClick={fetchNetworkInfo}
                disabled={networkInfoLoading}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm md:text-base"
              >
                {networkInfoLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <Users className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{networkInfoLoading ? 'Carregando...' : networkInfoLoaded ? 'Recarregar' : 'Carregar'}</span>
              </button>
            </div>
          </div>

          {networkInfoLoaded ? (
            networkInfo ? (
              <div className="space-y-6">
                {/* Patrocinador */}
                {networkInfo.sponsor && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Patrocinador</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-blue-600">Nome</p>
                        <Link 
                          href={`/admin/usuarios/${networkInfo.sponsor.id}`}
                          className="font-medium text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                        >
                          {networkInfo.sponsor.name}
                        </Link>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Email</p>
                        <p className="font-medium">{networkInfo.sponsor.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Código</p>
                        <p className="font-medium">{networkInfo.sponsor.referralCode}</p>
                      </div>
                    </div>
                  </div>
                )}



                {/* Indicações Diretas */}
                {networkInfo.referrals.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">Indicações Diretas ({networkInfo.referrals.length})</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-orange-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-orange-700">Nome</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-orange-700">Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-orange-700">Pacotes</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-orange-700">Cadastrado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-200">
                          {networkInfo.referrals.map((referral) => (
                            <tr key={referral.id} className="hover:bg-orange-100">
                              <td className="px-3 py-2 font-medium">
                                <Link 
                                  href={`/admin/usuarios/${referral.id}`}
                                  className="text-orange-700 hover:text-orange-900 hover:underline transition-colors"
                                >
                                  {referral.name}
                                </Link>
                              </td>
                              <td className="px-3 py-2 text-sm">{referral.email}</td>
                              <td className="px-3 py-2">
                                {referral.packages.length > 0 ? (
                                  <div className="space-y-1">
                                    {referral.packages.map((pkg, index) => (
                                      <span key={index} className="inline-block px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded">
                                        {pkg.package.name} - {formatCurrency(pkg.package.price)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Nenhum pacote</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm">{formatDate(referral.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!networkInfo.sponsor && networkInfo.referrals.length === 0 && (
                  <div className="text-center py-6 md:py-8">
                    <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                    <p className="text-sm md:text-base text-gray-500">Nenhuma informação de rede disponível</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500">Erro ao carregar informações de rede</p>
              </div>
            )
          ) : (
            <div className="text-center py-6 md:py-8">
              <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-gray-500">Clique em &quot;Carregar Rede&quot; para ver os dados</p>
            </div>
          )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Gerar Pacote */}
      {user && (
        <GeneratePackageModal
          isOpen={isGeneratePackageModalOpen}
          onClose={() => setIsGeneratePackageModalOpen(false)}
          userId={user.id.toString()}
          userName={user.name}
          onSuccess={handleGeneratePackageSuccess}
        />
      )}

      {/* Modal Alterar Mineradora do Pacote */}
      <ChangePackageMinerModal
        isOpen={packageToChangeMiner !== null}
        onClose={handleCloseChangePackageMiner}
        packageInfo={
          packageToChangeMiner !== null
            ? (() => {
                const selectedPackage = user?.packages.find((pkg) => pkg.id === packageToChangeMiner)
                if (!selectedPackage) return null
                return {
                  id: selectedPackage.id,
                  name: selectedPackage.name,
                  minerId: selectedPackage.minerId,
                  minerName: selectedPackage.minerName
                }
              })()
            : null
        }
        onConfirm={handleConfirmChangePackageMiner}
        isLoading={isChangingPackageMiner}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={cancelDeletePackage}
        onConfirm={confirmDeletePackage}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Modal de Confirmação de Ativação/Desativação */}
      <ConfirmationModal
        isOpen={packageToToggle !== null}
        onClose={cancelTogglePackage}
        onConfirm={confirmTogglePackage}
        title="Alterar Status do Pacote"
        message={user?.packages.find(p => p.id === packageToToggle)?.isActive 
          ? "Tem certeza que deseja desativar este pacote? O usuário será removido do Clube dos 300 se não tiver outros pacotes elegíveis."
          : "Tem certeza que deseja ativar este pacote? O usuário será adicionado ao Clube dos 300 se for elegível."
        }
        confirmText={user?.packages.find(p => p.id === packageToToggle)?.isActive ? "Desativar" : "Ativar"}
        cancelText="Cancelar"
        type="warning"
        isLoading={isToggling}
      />

      {/* Modal de Gerar Bônus de Indicação */}
      <ConfirmationModal
        isOpen={packageToGenerateBonuses !== null}
        onClose={() => {
          if (!isGeneratingBonuses) setPackageToGenerateBonuses(null)
        }}
        onConfirm={confirmGenerateBonuses}
        title="Gerar bônus de indicação"
        message={getGenerateBonusesMessage()}
        confirmText="Gerar Bônus"
        cancelText="Cancelar"
        type="warning"
        isLoading={isGeneratingBonuses}
      >
        {isPackageToGenerateAdminGenerated && (
          <label className="flex items-start gap-2 text-left text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowAdminGeneratedBonuses}
              onChange={(e) => setAllowAdminGeneratedBonuses(e.target.checked)}
              className="mt-0.5"
              aria-label="Permitir bônus em pacote gerado pelo admin"
            />
            <span>
              Este pacote foi gerado pelo admin e normalmente não paga bônus. Marque para permitir a geração dos bônus de indicação.
            </span>
          </label>
        )}
      </ConfirmationModal>

      {/* Modal de Upgrade de Pacote */}
      <ConfirmationModal
        isOpen={packageToUpgrade !== null}
        onClose={() => {
          if (!isUpgradingPackage) setPackageToUpgrade(null)
        }}
        onConfirm={confirmUpgradePackage}
        title="Confirmar Upgrade"
        message={getUpgradeMessage()}
        confirmText="Fazer Upgrade"
        cancelText="Cancelar"
        type="warning"
        isLoading={isUpgradingPackage}
      />

      {/* Modal de Visualização de Foto */}
      <PhotoViewModal
        isOpen={isPhotoViewModalOpen}
        onClose={() => setIsPhotoViewModalOpen(false)}
        photoUrl={user?.photoUrl || null}
        userName={user?.name || ''}
      />

      {/* Modal de Adicionar Transação Financeira */}
      <AddTransactionModal
        isOpen={isAddFinancialTransactionModalOpen}
        onClose={() => setIsAddFinancialTransactionModalOpen(false)}
        userId={userId}
        showBonusAdjustment={isSuperAdmin()}
        onSubmit={handleCreateFinancialTransaction}
      />

      {/* Modal de Confirmação de Exclusão de Transação */}
      <ConfirmationModal
        isOpen={isDeleteTransactionModalOpen}
        onClose={() => {
          setIsDeleteTransactionModalOpen(false)
          setTransactionToDelete(null)
        }}
        onConfirm={confirmDeleteTransaction}
        title="Confirmar Exclusão de Transação"
        message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita e a transação será permanentemente removida do sistema."
        confirmText="Excluir Transação"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeletingTransaction}
      />

      {/* Modal de Trocar Patrocinador */}
      <ChangeSponsorModal
        isOpen={isChangeSponsorModalOpen}
        onClose={() => setIsChangeSponsorModalOpen(false)}
        currentSponsor={networkInfo?.sponsor || null}
        onConfirm={handleChangeSponsorConfirm}
      />

      {/* Modal de Confirmação Final */}
      <ConfirmationModal
        isOpen={isConfirmChangeSponsorModalOpen}
        onClose={handleCancelChangeSponsor}
        onConfirm={handleFinalChangeSponsorConfirm}
        title="Confirmar Troca de Rede"
        message={`Tem certeza que deseja alterar o patrocinador deste usuário para ${newSponsorData?.name}? Esta ação irá alterar a estrutura da rede e pode impactar os bônus de rede.`}
        confirmText="Confirmar Troca"
        cancelText="Cancelar"
        type="warning"
        isLoading={isChangingSponsor}
      />

      {/* Modal de Confirmação de Banir/Ativar Usuário */}
      <ConfirmationModal
        isOpen={isConfirmUserStatusModalOpen}
        onClose={handleCancelUserStatusChange}
        onConfirm={handleConfirmUserStatusChange}
        title={user?.isActive ? 'Confirmar Banimento' : 'Confirmar Ativação'}
        message={
          user?.isActive 
            ? `Tem certeza que deseja banir o usuário ${user.name}? O usuário será desabilitado e não poderá acessar o sistema.`
            : `Tem certeza que deseja ativar o usuário ${user?.name}? O usuário poderá acessar o sistema normalmente.`
        }
        confirmText={user?.isActive ? 'Banir Usuário' : 'Ativar Usuário'}
        cancelText="Cancelar"
        type={user?.isActive ? 'danger' : 'warning'}
        isLoading={isChangingUserStatus}
      />

      {/* Modal de Edição de Usuário */}
      {isEditUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Edit className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Editar Dados do Usuário</h3>
                  <p className="text-sm text-gray-500">Atualize as informações do usuário</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                aria-label="Fechar modal"
                disabled={isUpdatingUser}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Nome e Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Seu nome completo"
                    disabled={isUpdatingUser}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu@email.com"
                    disabled={isUpdatingUser}
                  />
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
                      value={editCountry}
                      onChange={handleEditCountryChange}
                      disabled={isUpdatingUser}
                      variant="light"
                    />
                  </div>

                  {/* Input de Documento */}
                  <div className="md:col-span-2">
                    <DocumentInput
                      country={editCountry}
                      documentType={editDocumentType}
                      documentNumber={editDocumentNumber}
                      onChange={(type, number) => {
                        setEditDocumentType(type)
                        setEditDocumentNumber(number)
                      }}
                      disabled={isUpdatingUser}
                      variant="light"
                    />
                  </div>

                  {/* Input de Telefone */}
                  <div className="md:col-span-2">
                    <PhoneInput
                      countryCode={editPhoneCountryCode}
                      phoneNumber={editPhoneNumber}
                      country={editCountry}
                      onChange={(code, number) => {
                        setEditPhoneCountryCode(code)
                        setEditPhoneNumber(number)
                      }}
                      disabled={isUpdatingUser}
                      variant="light"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                disabled={isUpdatingUser}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={isUpdatingUser || !editFormData.name || !editFormData.email}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdatingUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recriar Senha */}
      {isPasswordResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <LinkIcon className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Recriar senha</h3>
                  <p className="text-sm text-gray-500">Gere um link para o usuário definir uma nova senha</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordResetModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                aria-label="Fechar modal"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Este link é o mesmo enviado pelo fluxo de &quot;Esqueceu a senha&quot; na página de login.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (!user) return
                    setIsGeneratingResetLink(true)
                    setGeneratedResetLink(null)
                    try {
                      const res = await fetch(`/api/admin/users/${user.id}/password-reset`, { method: 'POST' })
                      const data = await res.json()
                      if (!res.ok || !data?.success) {
                        throw new Error(data?.error || 'Falha ao gerar link')
                      }
                      setGeneratedResetLink(data.resetUrl as string)
                      toast.success('Link de redefinição gerado')
                    } catch (err) {
                      console.error('Erro ao gerar link de redefinição:', err)
                      toast.error('Erro ao gerar link de redefinição')
                    } finally {
                      setIsGeneratingResetLink(false)
                    }
                  }}
                  disabled={isGeneratingResetLink}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isGeneratingResetLink ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>Gerar link</span>
                    </>
                  )}
                </button>

                {generatedResetLink && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedResetLink)
                        toast.success('Link copiado para a área de transferência')
                      } catch {
                        toast.error('Falha ao copiar link')
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Copiar link
                  </button>
                )}
              </div>

              {generatedResetLink && (
                <div className="mt-2">
                  <label className="block text-sm text-gray-600 mb-1">Link gerado</label>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 break-all text-sm text-gray-800">
                    {generatedResetLink}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsPasswordResetModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recriar Senha Financeira */}
      {isFinancialPasswordResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  <LinkIcon className="w-6 h-6 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Recriar senha financeira</h3>
                  <p className="text-sm text-gray-500">Gere um link para o usuário definir uma nova senha financeira</p>
                </div>
              </div>
              <button
                onClick={() => setIsFinancialPasswordResetModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                aria-label="Fechar modal"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Este link é o mesmo enviado pelo fluxo de &quot;Esqueceu a senha financeira&quot; na página de perfil.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (!user) return
                    setIsGeneratingFinancialResetLink(true)
                    setGeneratedFinancialResetLink(null)
                    try {
                      const res = await fetch(`/api/admin/users/${user.id}/financial-password-reset`, { method: 'POST' })
                      const data = await res.json()
                      if (!res.ok || !data?.success) {
                        throw new Error(data?.error || 'Falha ao gerar link')
                      }
                      setGeneratedFinancialResetLink(data.resetUrl as string)
                      toast.success('Link de redefinição financeira gerado')
                    } catch (err) {
                      console.error('Erro ao gerar link de redefinição financeira:', err)
                      toast.error('Erro ao gerar link de redefinição financeira')
                    } finally {
                      setIsGeneratingFinancialResetLink(false)
                    }
                  }}
                  disabled={isGeneratingFinancialResetLink}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {isGeneratingFinancialResetLink ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>Gerar link</span>
                    </>
                  )}
                </button>

                {generatedFinancialResetLink && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedFinancialResetLink)
                        toast.success('Link copiado para a área de transferência')
                      } catch {
                        toast.error('Falha ao copiar link')
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Copiar link
                  </button>
                )}
              </div>

              {generatedFinancialResetLink && (
                <div className="mt-2">
                  <label className="block text-sm text-gray-600 mb-1">Link gerado</label>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 break-all text-sm text-gray-800">
                    {generatedFinancialResetLink}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsFinancialPasswordResetModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 