/**
 * Validação de Limite de Compra
 * Garante que o usuário não ultrapasse o limite de R$ 9.999,00 em compras totais
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// Limite máximo de compras por usuário (em reais)
export const MAX_PURCHASE_LIMIT = 59999.00

export interface PurchaseLimitValidationResult {
  isValid: boolean
  currentTotal: number
  newTotal: number
  limit: number
  remainingAmount: number
  message?: string
}

/**
 * Valida se o usuário pode realizar uma nova compra sem ultrapassar o limite
 * @param userId - ID do usuário
 * @param newPurchaseAmount - Valor da nova compra
 * @returns Resultado da validação com detalhes
 */
export async function validatePurchaseLimit(
  userId: bigint,
  newPurchaseAmount: number
): Promise<PurchaseLimitValidationResult> {
  try {
    console.log(`🔍 Validando limite de compra para usuário ${Number(userId)}`)
    console.log(`💰 Nova compra: R$ ${newPurchaseAmount.toFixed(2)}`)

    // Buscar todos os pacotes ATIVOS do usuário
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        isUnilevel: true, // Apenas pacotes unilevel contam para o limite
        isActive: true     // Apenas pacotes ativos
      },
      include: {
        package: {
          select: {
            price: true,
            name: true
          }
        }
      }
    })

    // Calcular total gasto
    let currentTotal = 0
    for (const userPackage of userPackages) {
      const packagePrice = Number(userPackage.package.price)
      currentTotal += packagePrice
      console.log(`📦 Pacote ${userPackage.package.name}: R$ ${packagePrice.toFixed(2)}`)
    }

    console.log(`💵 Total atual em pacotes: R$ ${currentTotal.toFixed(2)}`)

    // Calcular novo total
    const newTotal = currentTotal + newPurchaseAmount
    console.log(`💵 Novo total (incluindo compra): R$ ${newTotal.toFixed(2)}`)

    // Calcular quanto ainda pode comprar
    const remainingAmount = MAX_PURCHASE_LIMIT - currentTotal

    console.log(`💵 Valor restante disponível: R$ ${remainingAmount.toFixed(2)}`)
    console.log(`🚦 Limite máximo: R$ ${MAX_PURCHASE_LIMIT.toFixed(2)}`)

    // Validar se ultrapassa o limite
    if (newTotal > MAX_PURCHASE_LIMIT) {
      const exceededAmount = newTotal - MAX_PURCHASE_LIMIT
      console.log(`❌ LIMITE EXCEDIDO em R$ ${exceededAmount.toFixed(2)}`)
      
      return {
        isValid: false,
        currentTotal,
        newTotal,
        limit: MAX_PURCHASE_LIMIT,
        remainingAmount: Math.max(0, remainingAmount),
        message: `Esta compra excede o limite máximo de R$ ${MAX_PURCHASE_LIMIT.toFixed(2)}. Você já possui R$ ${currentTotal.toFixed(2)} em pacotes e pode comprar no máximo R$ ${remainingAmount.toFixed(2)} adicionais.`
      }
    }

    console.log(`✅ Compra dentro do limite permitido`)
    
    return {
      isValid: true,
      currentTotal,
      newTotal,
      limit: MAX_PURCHASE_LIMIT,
      remainingAmount,
      message: `Compra aprovada. Após esta compra, você terá R$ ${newTotal.toFixed(2)} em pacotes.`
    }

  } catch (error) {
    console.error('❌ Erro ao validar limite de compra:', error)
    throw new Error('Erro ao validar limite de compra')
  }
}

/**
 * Obtém o total atual de compras do usuário
 * @param userId - ID do usuário
 * @returns Total em reais
 */
export async function getUserCurrentPurchaseTotal(userId: bigint): Promise<number> {
  try {
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        isUnilevel: true,  // Apenas pacotes unilevel
        isActive: true      // Apenas pacotes ativos
      },
      include: {
        package: {
          select: {
            price: true
          }
        }
      }
    })

    let total = 0
    for (const userPackage of userPackages) {
      total += Number(userPackage.package.price)
    }

    return total
  } catch (error) {
    console.error('❌ Erro ao obter total de compras:', error)
    return 0
  }
}

/**
 * Obtém quanto o usuário ainda pode comprar
 * @param userId - ID do usuário
 * @returns Valor disponível em reais
 */
export async function getUserRemainingPurchaseLimit(userId: bigint): Promise<number> {
  try {
    const currentTotal = await getUserCurrentPurchaseTotal(userId)
    const remaining = MAX_PURCHASE_LIMIT - currentTotal
    return Math.max(0, remaining)
  } catch (error) {
    console.error('❌ Erro ao calcular limite restante:', error)
    return 0
  }
}

