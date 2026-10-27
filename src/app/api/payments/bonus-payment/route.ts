import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserBalance } from '@/lib/business-logic'
import { processPackagePayment, createPackagePaymentData } from '@/lib/package-payment-processor'
import { isBlacklisted } from '@/lib/blacklist'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { validatePurchaseLimit } from '@/lib/purchase-limit-validator'
import { validatePackageForMinerPurchase } from '@/lib/package-purchase-validator'

// Schema de validação
const bonusPaymentSchema = z.object({
  packageId: z.string().min(1, 'ID do pacote é obrigatório'),
  minerId: z.string().min(1, 'ID da mineradora é obrigatório'),
  quantity: z.number().int().min(1).max(50).default(1)
})

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // Verificar se usuário está na blacklist para pagamento de pacotes com saldo bônus
    const blacklistCheck = await isBlacklisted(userId, 'pay_package_bonus', 'pay')
    if (blacklistCheck.blocked) {
      return NextResponse.json(
        { success: false, error: blacklistCheck.reason || 'Você não está autorizado a pagar pacotes com saldo de bônus.' },
        { status: 403 }
      )
    }

    // 2. Validar body da requisição
    const body = await request.json()
    const validation = bonusPaymentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { packageId, minerId, quantity } = validation.data
    const packageIdBigInt = BigInt(packageId)
    const minerIdBigInt = BigInt(minerId)

    // 3. Validar disponibilidade de pacote na mineradora
    const packageValidation = await validatePackageForMinerPurchase({
      userId,
      packageId: packageIdBigInt,
      minerId: minerIdBigInt
    })

    if (!packageValidation.valid || !packageValidation.packageData) {
      return NextResponse.json(
        { success: false, error: packageValidation.error || 'Pacote inválido para a mineradora selecionada' },
        { status: 400 }
      )
    }

    // 4. Calcular valor total
    const packageData = packageValidation.packageData
    const totalAmount = packageData.price.mul(quantity)

    // 5. Validar limite de compra do usuário
    const limitValidation = await validatePurchaseLimit(userId, totalAmount.toNumber())
    if (!limitValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: limitValidation.message || 'Limite de compra excedido'
        },
        { status: 400 }
      )
    }

    // 6. Verificar saldo disponível
    const availableBalance = await getUserBalance(userId)

    if (availableBalance.lessThan(totalAmount)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Saldo insuficiente',
          data: {
            required: totalAmount.toNumber(),
            available: availableBalance.toNumber(),
            missing: totalAmount.sub(availableBalance).toNumber()
          }
        },
        { status: 400 }
      )
    }

    // 7. Gerar ID de correlação único
    const correlationID = `BONUS_${Date.now()}_${userId}`

    // 8. Criar transação de BONUS_PAYMENT (débito do saldo)
    const purchaseTransaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'BONUS_PAYMENT',
        amount: totalAmount, // Valor positivo (será subtraído em getUserBalance)
        description: `Pagamento de ${quantity}x ${packageData.name} usando saldo de bônus`,
        status: 'COMPLETED',
        correlationID,
        chargeId: correlationID,
        quantity
      }
    })

    console.log('✅ Transação de débito criada:', purchaseTransaction.id)

    // 9. Processar pacote (cria UserPackages, bonificações, etc.)
    // NOTA: Isso é executado FORA da transação para evitar timeout
    // O processPackagePayment tem suas próprias transações internas quando necessário
    const paymentData = await createPackagePaymentData(
      userId,
      packageIdBigInt,
      correlationID,
      quantity,
      minerIdBigInt
    )

    if (!paymentData) {
      // Se falhar, registrar erro mas não reverter o débito (será tratado manualmente)
      console.error('❌ Erro ao criar dados de pagamento')
      throw new Error('Erro ao criar dados de pagamento')
    }

    const processingResult = await processPackagePayment(paymentData)

    if (!processingResult.success) {
      // Se o processamento falhar, registrar mas não reverter automático
      // O suporte pode analisar e resolver manualmente
      console.error('❌ Erro ao processar pacote:', processingResult.errors)
      throw new Error(
        `Erro ao processar pacote: ${processingResult.errors.join(', ')}`
      )
    }

    console.log('🎉 Pagamento com bônus processado com sucesso')
    console.log(`   Usuário: ${Number(userId)}`)
    console.log(`   Pacote: ${packageData.name}`)
    console.log(`   Quantidade: ${quantity}`)
    console.log(`   Valor: R$ ${totalAmount.toFixed(2)}`)
    console.log(`   Saldo anterior: R$ ${availableBalance.toFixed(2)}`)
    console.log(`   Saldo após: R$ ${availableBalance.sub(totalAmount).toFixed(2)}`)

    // 10. Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Pagamento realizado com sucesso',
      data: {
        transactionId: purchaseTransaction.id.toString(),
        packageName: packageData.name,
        quantity,
        totalAmount: totalAmount.toNumber(),
        processingType: processingResult.processingType,
        upgradedPackages: processingResult.details.upgradedPackages,
        remainingPackages: processingResult.details.remainingPackages,
        addedToClube300: processingResult.details.addedToClube300,
        clube300MemberNumber: processingResult.details.clube300MemberNumber
      }
    })

  } catch (error) {
    console.error('❌ Erro ao processar pagamento com bônus:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar pagamento'
      },
      { status: 500 }
    )
  }
}

// GET - Verificar se usuário pode pagar com bônus
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const searchParams = request.nextUrl.searchParams
    const packageId = searchParams.get('packageId')
    const minerId = searchParams.get('minerId')
    const quantity = Number(searchParams.get('quantity') || '1')

    if (!packageId || !minerId) {
      return NextResponse.json(
        { success: false, error: 'ID do pacote e da mineradora são obrigatórios' },
        { status: 400 }
      )
    }

    const packageValidation = await validatePackageForMinerPurchase({
      userId,
      packageId: BigInt(packageId),
      minerId: BigInt(minerId)
    })

    if (!packageValidation.valid || !packageValidation.packageData) {
      return NextResponse.json(
        { success: false, error: packageValidation.error || 'Pacote inválido para a mineradora selecionada' },
        { status: 400 }
      )
    }

    // Calcular valor total
    const totalAmount = packageValidation.packageData.price.mul(quantity)

    // Verificar saldo disponível
    const availableBalance = await getUserBalance(userId)
    const hasSufficientBalance = availableBalance.greaterThanOrEqualTo(totalAmount)

    return NextResponse.json({
      success: true,
      data: {
        canPayWithBonus: hasSufficientBalance,
        availableBalance: availableBalance.toNumber(),
        requiredAmount: totalAmount.toNumber(),
        missingAmount: hasSufficientBalance 
          ? 0 
          : totalAmount.sub(availableBalance).toNumber()
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar pagamento com bônus:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar pagamento'
      },
      { status: 500 }
    )
  }
}

