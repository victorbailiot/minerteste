export interface ProfitSchedule {
  id: number
  totalProfit: number
  minerId: number | null
  miner?: {
    id: number
    name: string
  } | null
  scheduledAt: string
  isActive: boolean
  createdBy?: number | null
  createdAt: string
  updatedAt: string
  createdByUser?: {
    id: number
    name: string
    email: string
  } | null
}

export interface ProfitDivisionByPackage {
  packageId: number
  packageName: string
  profitPercent: number
  percentExtra: number
  totalProfitPercent: number
  activePackagesCount: number
  uniqueUsersCount?: number
  valuePerCota: number
  isClube300?: boolean
  totalCotas?: number
}

export interface ActiveProfitScheduleResponse {
  schedule: ProfitSchedule
  divisions: ProfitDivisionByPackage[]
  totalProfit: number
  miner?: {
    id: number
    name: string
  } | null
}

export interface ProfitSimulationResponse {
  divisions: ProfitDivisionByPackage[]
  totalProfit: number
}

