import { Decimal } from '@prisma/client/runtime/library'

// ====================================
// TIPOS E INTERFACES DO SISTEMA UNILEVEL
// ====================================

export interface UnilevelPackageData {
  id: bigint
  name: string
  price: Decimal
  points: number
  isUnilevel: boolean
  directBonus: Decimal
  boosted: Decimal
  profitSharePercent: Decimal
  reactivationAmount: Decimal
  reactivationBonus: Decimal
  isActive: boolean
}

export interface CareerLevelData {
  id: bigint
  name: string
  requiredPoints: number
  maxTeamVolumePercent: Decimal
  indirectBonusLevels: number
  reactivationLevels: number
  extraProfitPercent: Decimal
  travelBonus?: string
  travelValue?: Decimal
  isActive: boolean
}

export interface UnilevelUserData {
  id: bigint
  userId: bigint
  sponsorId?: bigint
  careerLevelId?: bigint
  totalPoints: number
  teamVolume: Decimal
  isActive: boolean
}

export interface BonusDistributionData {
  userId: bigint
  amount: Decimal
  type: 'DIRECT_BONUS' | 'INDIRECT_BONUS' | 'REACTIVATION_BONUS' | 'PROFIT_SHARE' | 'CAREER_BONUS' | 'TRAVEL_BONUS'
  level?: number
  sourceUserId?: bigint
  sourcePackageId?: bigint
  description: string
}

export interface UnilevelNetworkData {
  level1: UnilevelUserData[]
  level2: UnilevelUserData[]
  level3: UnilevelUserData[]
  level4: UnilevelUserData[]
  level5: UnilevelUserData[]
  level6: UnilevelUserData[]
  level7: UnilevelUserData[]
}



export interface UnilevelProfitDistributionData {
  userId: bigint
  userName: string
  packageName: string
  careerLevelName?: string
  amount: Decimal
  profitPercent: Decimal
  totalProfit: Decimal
}

export interface UnilevelUserStats {
  totalReferrals: number
  totalPoints: number
  teamVolume: Decimal
  careerLevel?: string
  totalBonuses: Decimal
  directBonuses: Decimal
  indirectBonuses: Decimal
  reactivationBonuses: Decimal
  profitShares: Decimal
  careerBonuses: Decimal
  travelBonuses: Decimal
} 