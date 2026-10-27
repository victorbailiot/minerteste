export interface Clube300Membership {
  id: string
  memberNumber: number
  cotas: number
  minerId: string
  minerName: string
  packageName: string
  createdAt: string
}

export interface Clube300CheckMembershipResponse {
  success: boolean
  isMember: boolean
  memberships?: Clube300Membership[]
  message?: string
}
