// ==================== LOJA VIRTUAL - INTERFACES ====================

export interface StoreCategory {
  id: string
  name: string
  description?: string
  slug: string
  imageUrl?: string
  isActive: boolean
  parentId?: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  parent?: StoreCategory
  children?: StoreCategory[]
  productsCount?: number
}

export interface StoreProduct {
  id: string
  name: string
  description: string
  shortDesc?: string
  sku: string
  slug: string
  price: number
  comparePrice?: number
  costPrice?: number
  categoryId: string
  type: StoreProductType
  stock: number
  lowStockAlert: number
  weight?: number
  width?: number
  height?: number
  length?: number
  images: string[]
  mainImage?: string
  featured: boolean
  isActive: boolean
  tags: string[]
  specifications?: Record<string, any>
  metaTitle?: string
  metaDescription?: string
  digitalFileUrl?: string
  generatesCoupon?: boolean
  promotionId?: string | null
  promotion?: { id: string; title: string } | null
  createdAt: Date
  updatedAt: Date
  category?: StoreCategory
  variants?: StoreProductVariant[]
  reviews?: StoreProductReview[]
  averageRating?: number
  reviewsCount?: number
}

export interface StoreProductVariant {
  id: string
  productId: string
  name: string
  sku: string
  price: number
  comparePrice?: number
  stock: number
  attributes: Record<string, any>
  imageUrl?: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  product?: StoreProduct
}

export interface StoreProductReview {
  id: string
  productId: string
  userId: string
  rating: number
  title?: string
  comment?: string
  isApproved: boolean
  isVerified: boolean
  helpfulCount: number
  createdAt: Date
  updatedAt: Date
  product?: StoreProduct
  user?: {
    id: string
    name: string
  }
}

export interface StoreOrder {
  id: string
  orderNumber: string
  userId: string
  status: StoreOrderStatus
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  shippingAddressId: string
  shippingMethod?: string
  shippingService?: string
  estimatedDelivery?: Date
  paymentMethod: StorePaymentMethod
  paymentStatus: StorePaymentStatus
  transactionId?: string
  couponCode?: string
  trackingCode?: string
  notes?: string
  cancelReason?: string
  paidAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
  user?: {
    id: string
    name: string
    email: string
  }
  shippingAddress?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  items?: StoreOrderItem[]
}

export interface StoreOrderItem {
  id: string
  orderId: string
  productId: string
  variantId?: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
  imageUrl?: string
  attributes?: Record<string, any>
  createdAt: Date
  product?: StoreProduct
  variant?: StoreProductVariant
}

export interface StoreWishlistItem {
  id: string
  userId: string
  productId: string
  createdAt: Date
  product?: StoreProduct
}

export interface StoreDiscountCoupon {
  id: string
  code: string
  description?: string
  discountType: StoreDiscountType
  value: number
  minPurchase?: number
  maxDiscount?: number
  maxUses?: number
  usedCount: number
  isActive: boolean
  startsAt?: Date
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface StoreShippingMethod {
  id: string
  name: string
  description?: string
  carrier: string
  service: string
  estimatedDays: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ==================== ENUMS ====================

export enum StoreProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL'
}

export enum StoreOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum StorePaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BALANCE = 'BALANCE',
  BOLETO = 'BOLETO'
}

export enum StorePaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

export enum StoreDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED'
}

// ==================== UTILITY TYPES ====================

export interface CartItem {
  id: string
  productId: string
  variantId?: string
  variantName?: string
  name: string
  sku: string
  price: number
  quantity: number
  imageUrl?: string
  attributes?: Record<string, any>
  type: StoreProductType
  weight?: number
  width?: number
  height?: number
  length?: number
}

export interface ShippingOption {
  carrier: string
  service: string
  price: number
  estimatedDays: number
  deliveryDate: Date
}

export interface CouponValidation {
  isValid: boolean
  discount: number
  message?: string
  coupon?: StoreDiscountCoupon
}

export interface OrderSummary {
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  items: CartItem[]
}

// ==================== API RESPONSES ====================

export interface ProductListResponse {
  products: StoreProduct[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CategoryListResponse {
  categories: StoreCategory[]
  total: number
}

export interface OrderListResponse {
  orders: StoreOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ==================== FILTERS ====================

export interface ProductFilters {
  search?: string
  categoryId?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  featured?: boolean
  tags?: string[]
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'popular'
  page?: number
  pageSize?: number
}

export interface OrderFilters {
  status?: StoreOrderStatus
  paymentStatus?: StorePaymentStatus
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}
