export interface Miner {
  id: string
  name: string
  address: string
  city: string
  state: string
  createdAt: string
  updatedAt: string
}

export interface MinerUpsertInput {
  name: string
  address: string
  city: string
  state: string
}

export interface MinerListResponse {
  success: boolean
  data: Miner[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface MinerOption {
  id: number
  name: string
}
