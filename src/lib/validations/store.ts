import { z } from 'zod'

// ==================== CATEGORY SCHEMAS ====================

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  description: z.string().optional(),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  imageUrl: z.string().url().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export const updateCategorySchema = createCategorySchema.partial()

export const categoryIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido'),
})

// ==================== PRODUCT SCHEMAS ====================

// Função auxiliar para gerar slug a partir do nome
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens no início e fim
    .substring(0, 255)
}

// Schema base (objeto puro para poder usar .partial() no update)
const productSchemaBaseObject = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  shortDesc: z.string().max(500).optional(),
  sku: z.string().max(100).optional(),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/).optional(),
  price: z.number().positive('Preço deve ser positivo'),
  comparePrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  categoryId: z.string().regex(/^\d+$/),
  type: z.enum(['PHYSICAL', 'DIGITAL']),
  stock: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  weight: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  length: z.number().positive().optional(),
  originZipCode: z
    .string()
    .max(10)
    .optional()
    .transform((v) => {
      if (!v || v.trim() === '') return undefined
      const cleaned = v.replace(/\D/g, '')
      return cleaned.length === 8 ? cleaned : undefined
    }),
  images: z.array(z.string().url()).default([]),
  mainImage: z.string().url().optional(),
  featured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.unknown()).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  digitalFileUrl: z.string().url().optional(),
  generatesCoupon: z.boolean().default(false),
  promotionId: z.string().regex(/^\d+$/).optional().nullable(),
})

// Refine e transform para cupom (usado em create e update)
const couponRefine = (data: { generatesCoupon?: boolean; type?: string; promotionId?: string | null }) => {
  if (data.generatesCoupon) {
    return data.type === 'DIGITAL' && data.promotionId != null && data.promotionId !== ''
  }
  return true
}
const couponTransform = <T extends { type?: string; generatesCoupon?: boolean; promotionId?: string | null }>(data: T): T => {
  if (data.type === 'PHYSICAL') {
    return { ...data, generatesCoupon: false, promotionId: undefined }
  }
  if (!data.generatesCoupon) {
    return { ...data, promotionId: undefined }
  }
  return data
}

// Schema para criar produtos
export const createProductSchema = productSchemaBaseObject
  .refine(couponRefine, {
    message: 'Produto digital que gera cupom deve ter uma promoção selecionada',
    path: ['promotionId']
  })
  .transform(couponTransform)
  .transform((data) => {
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name)
    }
    if (!data.sku) {
      const timestamp = Date.now().toString().slice(-8)
      const nameSlug = generateSlug(data.name).substring(0, 20)
      data.sku = `${nameSlug}-${timestamp}`.substring(0, 100)
    }
    return data
  })

// Schema para atualizar produtos (todos os campos opcionais)
export const updateProductSchema = productSchemaBaseObject
  .partial()
  .refine(couponRefine, {
    message: 'Produto digital que gera cupom deve ter uma promoção selecionada',
    path: ['promotionId']
  })
  .transform(couponTransform)

export const productIdSchema = z.object({
  id: z.string().regex(/^\d+$/),
})

// ==================== PRODUCT VARIANT SCHEMAS ====================

export const createProductVariantSchema = z.object({
  productId: z.string().regex(/^\d+$/),
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  attributes: z.record(z.string(), z.unknown()),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateProductVariantSchema = createProductVariantSchema.partial().omit({ productId: true })

// ==================== PRODUCT REVIEW SCHEMAS ====================

export const createProductReviewSchema = z.object({
  productId: z.string().regex(/^\d+$/),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  comment: z.string().max(5000).optional(),
})

export const updateProductReviewSchema = z.object({
  isApproved: z.boolean(),
})

// ==================== ORDER SCHEMAS ====================

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().regex(/^\d+$/),
    variantId: z.string().regex(/^\d+$/).optional(),
    quantity: z.number().int().positive(),
  })).min(1, 'Pedido deve ter pelo menos um item'),
  shippingAddressId: z.string().regex(/^\d+$/),
  shippingMethod: z.string().optional(),
  shippingService: z.string().optional(),
  shippingCost: z.number().min(0).default(0),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BALANCE', 'BOLETO']),
  couponCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  notes: z.string().optional(),
  cancelReason: z.string().optional(),
})

export const addTrackingCodeSchema = z.object({
  trackingCode: z.string().min(1).max(255),
  shippedAt: z.string().datetime().optional(),
})

// ==================== SHIPPING SCHEMAS ====================

export const calculateShippingSchema = z.object({
  postalCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  items: z.array(z.object({
    productId: z.string().regex(/^\d+$/),
    variantId: z.string().regex(/^\d+$/).optional(),
    quantity: z.number().int().positive(),
  })).min(1),
})

// ==================== COUPON SCHEMAS ====================

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().max(500).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minPurchase: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
})

export const updateCouponSchema = createCouponSchema.partial().omit({ code: true })

export const validateCouponSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  subtotal: z.number().positive(),
})

// ==================== WISHLIST SCHEMAS ====================

export const addToWishlistSchema = z.object({
  productId: z.string().regex(/^\d+$/),
})

export const removeFromWishlistSchema = z.object({
  productId: z.string().regex(/^\d+$/),
})

// ==================== QUERY SCHEMAS ====================

export const productListQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().regex(/^\d+$/).optional(),
  minPrice: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  inStock: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  featured: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  tags: z.string().transform(val => val.split(',')).optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'popular']).optional(),
  // Usar coerce + default numérico para evitar default string ("20") escapar do transform e chegar no Prisma como string.
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export const orderListQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export const categoryListQuerySchema = z.object({
  parentId: z.string().regex(/^\d+$/).optional(),
  isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
})

// ==================== UPLOAD SCHEMA ====================

export const uploadProductImagesSchema = z.object({
  productId: z.string().regex(/^\d+$/).optional(),
  images: z.array(z.instanceof(File)).min(1).max(10),
})

// ==================== TYPE INFERENCE ====================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>
export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type AddTrackingCodeInput = z.infer<typeof addTrackingCodeSchema>
export type CalculateShippingInput = z.infer<typeof calculateShippingSchema>
export type CreateCouponInput = z.infer<typeof createCouponSchema>
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>
export type ProductListQuery = z.infer<typeof productListQuerySchema>
export type OrderListQuery = z.infer<typeof orderListQuerySchema>
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>
