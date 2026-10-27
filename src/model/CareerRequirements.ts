export interface CareerLegRequirement {
  id: bigint
  careerId: bigint
  legSlot: number
  requiredCareerId: bigint
  includeIndirects: boolean
  minOccurrences: number
  createdAt: Date
  updatedAt: Date
}

export interface CareerLegRequirementsByLevel {
  careerId: bigint
  requirements: CareerLegRequirement[]
}


