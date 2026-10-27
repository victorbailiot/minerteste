/**
 * Tipos relacionados a promoções e cupons de sorteio
 */

export interface Promotion {
  id: bigint
  title: string
  description: string | null
  image: string | null
  startDate: Date
  endDate: Date
  isActive: boolean
  maxCoupons: number | null
  createdAt: Date
  updatedAt: Date
}

export interface Coupon {
  id: bigint
  promotionId: bigint
  userId: bigint
  luckyNumber: number
  createdAt: Date
}

export interface PromotionWithCoupons extends Promotion {
  coupons: Coupon[]
}

export interface CouponWithPromotion extends Coupon {
  promotion: Promotion
}

export interface CouponWithUser extends Coupon {
  user: {
    id: bigint
    name: string
    email: string
  }
}

export interface CreatePromotionInput {
  title: string
  description?: string
  image?: string
  startDate: Date
  endDate: Date
}

export interface UpdatePromotionInput {
  title?: string
  description?: string
  image?: string
  startDate?: Date
  endDate?: Date
  isActive?: boolean
}


