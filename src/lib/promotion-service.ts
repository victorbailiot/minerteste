import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Gerar um número da sorte único de 6 dígitos (ex: 100000 a 999999)
 */
export async function generateUniqueLuckyNumber(): Promise<number> {
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    attempts++
    // Gerar número de 6 dígitos entre 100000 e 999999
    const randomNumber = Math.floor(100000 + Math.random() * 900000)

    const existingCoupon = await prisma.coupon.findUnique({
      where: { luckyNumber: randomNumber },
      select: { id: true }
    })

    if (!existingCoupon) {
      return randomNumber
    }
  }

  // Fallback: buscar o maior número da sorte atual e somar 1
  const highestCoupon = await prisma.coupon.findFirst({
    orderBy: { luckyNumber: 'desc' },
    select: { luckyNumber: true }
  })

  const baseNumber = highestCoupon?.luckyNumber || 100000
  return baseNumber + 1
}

interface ProcessPromotionTriggersParams {
  userId: bigint
  type: 'UPGRADE' | 'PURCHASE'
  fromPackageId?: bigint | null
  toPackageId: bigint
  packagePrice: number | Decimal
  transactionId?: bigint | null
}

/**
 * Processar gatilhos automáticos de promoção após um upgrade ou compra de pacote ativado
 */
export async function processAutomaticPromotionTriggers(
  params: ProcessPromotionTriggersParams
): Promise<{
  couponsGenerated: number
  sponsorBonusDistributed: number
}> {
  const { userId, type, fromPackageId, toPackageId, packagePrice, transactionId } = params
  const now = new Date()

  console.log(`[PromotionService] Verificando promoções para usuário ${Number(userId)} | Tipo: ${type}`)

  let couponsGenerated = 0
  let sponsorBonusDistributed = 0

  try {
    // 1. Buscar usuário e patrocinador
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, sponsorId: true }
    })

    if (!user) {
      console.warn(`[PromotionService] Usuário ${Number(userId)} não encontrado.`)
      return { couponsGenerated: 0, sponsorBonusDistributed: 0 }
    }

    // 2. Buscar promoções ativas vigentes
    const activePromotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      }
    })

    if (activePromotions.length === 0) {
      console.log(`[PromotionService] Nenhuma promoção ativa vigente no momento.`)
      return { couponsGenerated: 0, sponsorBonusDistributed: 0 }
    }

    for (const promo of activePromotions) {
      let isEligible = false
      let sourceType = 'AUTOMATIC'

      if (type === 'UPGRADE' && promo.triggerType === 'PACKAGE_UPGRADE') {
        const upgradeRules = promo.upgradeRules as Array<{ fromPackageId?: string | number | null; toPackageId?: string | number | null }> | null
        if (Array.isArray(upgradeRules) && upgradeRules.length > 0) {
          const ruleMatch = upgradeRules.some(rule => {
            const ruleToId = rule.toPackageId ? BigInt(rule.toPackageId) : null
            const ruleFromId = rule.fromPackageId && String(rule.fromPackageId) !== 'ALL' ? BigInt(rule.fromPackageId) : null

            const toMatch = ruleToId ? ruleToId === toPackageId : true
            const fromMatch = ruleFromId ? ruleFromId === fromPackageId : true
            return toMatch && fromMatch
          })
          if (ruleMatch) {
            isEligible = true
            sourceType = 'AUTOMATIC_UPGRADE'
          }
        } else {
          // Para upgrade legado, verificar se o toPackageId bate e (se configurado) se o fromPackageId bate
          const toMatch = promo.toPackageId ? promo.toPackageId === toPackageId : true
          const fromMatch = promo.fromPackageId ? promo.fromPackageId === fromPackageId : true
          if (toMatch && fromMatch) {
            isEligible = true
            sourceType = 'AUTOMATIC_UPGRADE'
          }
        }
      } else if (type === 'PURCHASE' && promo.triggerType === 'PACKAGE_PURCHASE') {
        // Para compra direta, verificar se o toPackageId bate
        const toMatch = promo.toPackageId ? promo.toPackageId === toPackageId : true
        if (toMatch) {
          isEligible = true
          sourceType = 'AUTOMATIC_PURCHASE'
        }
      }

      if (!isEligible) {
        continue
      }

      console.log(`[PromotionService] Usuário elegível para promoção: "${promo.title}" (ID: ${Number(promo.id)})`)

      // 3. Gerar cupons/números da sorte
      const quantityToGenerate = promo.couponsPerAction || 1

      for (let i = 0; i < quantityToGenerate; i++) {
        const luckyNumber = await generateUniqueLuckyNumber()
        await prisma.coupon.create({
          data: {
            promotionId: promo.id,
            userId: user.id,
            luckyNumber,
            sourceType,
            notes: `Gerado automaticamente via ${type} (Transação #${transactionId ? Number(transactionId) : 'N/A'})`
          }
        })
        couponsGenerated++
        console.log(`   [Cupom] Número da sorte #${luckyNumber} emitido para "${promo.title}"`)
      }

      // 4. Processar Bônus Extra e Prêmio do Patrocinador (Sponsor)
      if (user.sponsorId) {
        const extraBonusPercent = Number(promo.sponsorExtraBonusPercent || 0)
        const prizeDesc = promo.sponsorPrizeDescription

        // 4a. Creditar Bônus % Extra para o Patrocinador
        if (extraBonusPercent > 0) {
          const pkgPriceNum = typeof packagePrice === 'number' ? packagePrice : packagePrice.toNumber()
          const extraAmount = (pkgPriceNum * extraBonusPercent) / 100

          if (extraAmount > 0) {
            const extraDecimal = new Decimal(extraAmount.toFixed(2))

            // Criar transação de bônus para o patrocinador
            await prisma.transaction.create({
              data: {
                userId: user.sponsorId,
                sourceUserId: user.id,
                type: 'DIRECT_BONUS',
                amount: extraDecimal,
                status: 'COMPLETED',
                description: `Bônus Extra de Indicação (+${extraBonusPercent}%) - Promoção: ${promo.title} (Comprador: ${user.name})`
              }
            })

            sponsorBonusDistributed += extraAmount
            console.log(`   [Bonus] Bônus de indicação (+${extraBonusPercent}%, R$ ${extraAmount.toFixed(2)}) creditado para patrocinador ID ${Number(user.sponsorId)}`)
          }
        }

        // 4b. Registrar notificação/registro do prêmio do patrocinador se houver
        if (prizeDesc && prizeDesc.trim().length > 0) {
          await prisma.transaction.create({
            data: {
              userId: user.sponsorId,
              sourceUserId: user.id,
              type: 'CAREER_PRIZE',
              amount: new Decimal(0),
              status: 'COMPLETED',
              description: `Prêmio de Indicador da Promoção "${promo.title}": ${prizeDesc} (Indicado: ${user.name})`
            }
          })
          console.log(`   [Premio] Prêmio registrado: "${prizeDesc}" para patrocinador ID ${Number(user.sponsorId)}`)
        }
      }
    }
  } catch (error) {
    console.error('[PromotionService] Erro ao processar gatilhos de promoção:', error)
  }

  return { couponsGenerated, sponsorBonusDistributed }
}

/**
 * Emitir números da sorte manualmente pelo administrador
 */
export async function issueManualCoupons(params: {
  promotionId: bigint
  userId: bigint
  quantity: number
  notes?: string
}): Promise<{ success: boolean; generatedCoupons: number[]; error?: string }> {
  const { promotionId, userId, quantity, notes } = params

  try {
    const promo = await prisma.promotion.findUnique({
      where: { id: promotionId }
    })

    if (!promo) {
      return { success: false, generatedCoupons: [], error: 'Promoção não encontrada' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    })

    if (!user) {
      return { success: false, generatedCoupons: [], error: 'Usuário não encontrado' }
    }

    const generatedCoupons: number[] = []

    for (let i = 0; i < quantity; i++) {
      const luckyNumber = await generateUniqueLuckyNumber()
      await prisma.coupon.create({
        data: {
          promotionId: promo.id,
          userId: user.id,
          luckyNumber,
          sourceType: 'MANUAL_ADMIN',
          notes: notes || 'Concedido manualmente pelo Administrador'
        }
      })
      generatedCoupons.push(luckyNumber)
    }

    console.log(`[PromotionService] ${quantity} cupons manuais gerados para o usuário ${user.name}`)

    return {
      success: true,
      generatedCoupons
    }
  } catch (error: any) {
    console.error('[PromotionService] Erro ao emitir cupons manuais:', error)
    return {
      success: false,
      generatedCoupons: [],
      error: error.message || 'Erro ao emitir cupons manuais'
    }
  }
}

/**
 * Buscar promoção ativa no momento
 */
export async function getActivePromotion() {
  const now = new Date()
  return await prisma.promotion.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Criar cupom para usuário diretamente (usado em checkout da loja e sincronização)
 */
export async function createCouponForUser(
  userId: bigint,
  promotionId: bigint,
  allowMultiple: boolean = false,
  sourceType: string = 'AUTOMATIC'
) {
  const promo = await prisma.promotion.findUnique({
    where: { id: promotionId }
  })

  if (!promo || !promo.isActive) {
    return null
  }

  if (!allowMultiple) {
    const existing = await prisma.coupon.findFirst({
      where: { userId, promotionId }
    })
    if (existing) {
      return existing
    }
  }

  const luckyNumber = await generateUniqueLuckyNumber()
  const coupon = await prisma.coupon.create({
    data: {
      userId,
      promotionId,
      luckyNumber,
      sourceType,
      notes: 'Gerado via ação do sistema'
    }
  })

  return coupon
}

/**
 * Processar cupom de upgrade (compatibilidade legada)
 */
export async function processUpgradeCoupon(params: {
  userId: bigint
  fromPackageId?: bigint | null
  toPackageId: bigint
  packagePrice: number | Decimal
  transactionId?: bigint | null
}) {
  return await processAutomaticPromotionTriggers({
    userId: params.userId,
    type: 'UPGRADE',
    fromPackageId: params.fromPackageId,
    toPackageId: params.toPackageId,
    packagePrice: params.packagePrice,
    transactionId: params.transactionId
  })
}

