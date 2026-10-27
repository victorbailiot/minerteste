import { Decimal } from '@prisma/client/runtime/library'

/**
 * Interface para o resultado do upgrade automático de pacotes
 */
export interface UpgradeResult {
  /** Novos pacotes a ativar (upgrades) */
  upgradedPackages: PackageUpgrade[]
  /** Pacotes inferiores restantes (se houver sobra) */
  remainingPackages: PackageUpgrade[]
  /** IDs dos pacotes antigos a desativar */
  disabledPackageIds: bigint[]
  /** Valor total que foi usado para upgrade */
  totalValueUsed: Decimal
  /** Valor restante após upgrade (se houver) */
  remainingValue: Decimal
}

/**
 * Interface para um pacote no contexto de upgrade
 */
export interface PackageUpgrade {
  /** ID do pacote */
  packageId: bigint
  /** ID da mineradora (upgrades só combinam pacotes da mesma mineradora) */
  minerId?: bigint | null
  /** Nome do pacote */
  name: string
  /** Valor do pacote */
  price: Decimal
  /** Quantidade de pacotes */
  quantity: number
  /** Se é um upgrade ou pacote restante */
  isUpgrade: boolean
  /** Snapshot do bônus direto no momento da criação do pacote */
  directBonus?: Decimal
}

/**
 * Interface para dados de entrada do upgrade
 */
export interface PackageUpgradeInput {
  /** Pacotes atuais do usuário */
  currentUserPackages: UserPackageData[]
  /** Pacotes da nova compra */
  newPurchasePackages: PurchasePackageData[]
  /** Todos os pacotes disponíveis no sistema */
  allPackages: SystemPackageData[]
  /** Mineradora da compra em andamento (herdada nos pacotes gerados por upgrade) */
  purchaseMinerId?: bigint
}

/**
 * Interface para pacote atual do usuário
 */
export interface UserPackageData {
  /** ID do UserPackage */
  id: bigint
  /** ID do pacote */
  packageId: bigint
  /** ID da mineradora vinculada ao pacote */
  minerId?: bigint | null
  /** Nome do pacote */
  name: string
  /** Valor do pacote */
  price: Decimal
  /** Se está ativo */
  isActive: boolean
  /** Data de ativação */
  activatedAt: Date
}

/**
 * Interface para pacote da nova compra
 */
export interface PurchasePackageData {
  /** ID do pacote */
  packageId: bigint
  /** ID da mineradora escolhida na compra */
  minerId?: bigint
  /** Nome do pacote */
  name: string
  /** Valor do pacote */
  price: Decimal
  /** Quantidade comprada */
  quantity: number
}

/**
 * Interface para pacote do sistema
 */
export interface SystemPackageData {
  /** ID do pacote */
  id: bigint
  /** Nome do pacote */
  name: string
  /** Valor do pacote */
  price: Decimal
  /** Ordem na hierarquia (menor valor = 1, maior valor = n) */
  hierarchyOrder: number
  /** Bônus direto configurado para este pacote */
  directBonus: Decimal
}

