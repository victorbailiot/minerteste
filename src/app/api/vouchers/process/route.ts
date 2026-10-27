import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateVoucher } from '@/lib/voucher-utils'
import { processPackagePayment } from '@/lib/package-payment-processor'
import { getUserBalance } from '@/lib/business-logic'
import { isBlacklisted } from '@/lib/blacklist'
import { z } from 'zod'
import { TransactionType } from '@/generated/prisma'
import { validatePackageForMinerPurchase } from '@/lib/package-purchase-validator'

// Schema de validação
const processVoucherSchema = z.object({
  code: z.string().min(10),
  confirmPayment: z.boolean()
})

/**
 * POST /api/vouchers/process
 * Processa o pagamento de um voucher usando saldo de bônus do pagador
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const validation = processVoucherSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { code, confirmPayment } = validation.data
    const payerId = BigInt(session.user.id)

    // Busca o voucher
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!voucher) {
      return NextResponse.json(
        { error: 'Voucher não encontrado' },
        { status: 404 }
      )
    }

    // Verifica se o beneficiário está na blacklist para pagamento com crédito minerador
    const beneficiaryBlacklistCheck = await isBlacklisted(voucher.beneficiaryId, 'pay_package_miner_credit', 'pay')
    if (beneficiaryBlacklistCheck.blocked) {
      return NextResponse.json(
        { error: beneficiaryBlacklistCheck.reason || 'O beneficiário não está autorizado a usar crédito minerador para pacotes.' },
        { status: 403 }
      )
    }

    if (!voucher.minerId) {
      return NextResponse.json(
        { error: 'Voucher sem mineradora definida. Gere um novo voucher.' },
        { status: 400 }
      )
    }

    // Verifica se o pagador não é o próprio beneficiário
    if (voucher.beneficiaryId === payerId) {
      return NextResponse.json(
        { error: 'Você não pode pagar seu próprio voucher' },
        { status: 400 }
      )
    }

    // Valida o voucher
    const voucherValidation = validateVoucher(voucher)
    if (!voucherValidation.valid) {
      return NextResponse.json(
        { error: voucherValidation.error },
        { status: 400 }
      )
    }

    // Busca informações do pacote para a mineradora do voucher
    const packageValidation = await validatePackageForMinerPurchase({
      userId: voucher.beneficiaryId,
      packageId: voucher.packageId,
      minerId: voucher.minerId
    })

    if (!packageValidation.valid || !packageValidation.packageData) {
      return NextResponse.json(
        { error: packageValidation.error || 'Pacote não disponível para a mineradora selecionada' },
        { status: 400 }
      )
    }
    const pkg = packageValidation.packageData

    // Verifica saldo de bônus do pagador usando a função existente
    const availableBonus = await getUserBalance(payerId)

    // Usa a quantidade do voucher para calcular o valor total
    const voucherQuantity = voucher.quantity || 1
    const requiredAmount = Number(pkg.price.mul(voucherQuantity))

    if (Number(availableBonus) < requiredAmount) {
      return NextResponse.json(
        {
          error: 'Saldo de bônus insuficiente',
          available: Number(availableBonus).toFixed(2),
          required: requiredAmount.toFixed(2),
          missing: (requiredAmount - Number(availableBonus)).toFixed(2)
        },
        { status: 400 }
      )
    }

    if (!confirmPayment) {
      // Apenas retorna informações para confirmação
      const beneficiary = await prisma.user.findUnique({
        where: { id: voucher.beneficiaryId },
        select: { name: true, email: true }
      })

      return NextResponse.json({
        success: true,
        needConfirmation: true,
        payment: {
          amount: requiredAmount,
          quantity: voucherQuantity,
          packageName: pkg.name,
          beneficiary: beneficiary?.name,
          availableBonus: Number(availableBonus),
          remainingBonus: Number(availableBonus) - requiredAmount
        }
      })
    }

    // Processa o pagamento em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cria a transação de débito do pagador
      const paymentTransaction = await tx.transaction.create({
        data: {
          userId: payerId,
          type: TransactionType.SOLIDARITY_PAYMENT,
          amount: pkg.price.mul(voucherQuantity),
          quantity: voucherQuantity,
          description: `Credito minerador - ${voucherQuantity}x ${pkg.name} para ${voucher.beneficiaryId}`,
          status: 'COMPLETED',
          paidAt: new Date(),
          referenceId: voucher.code
        }
      })

      // 3. Atualiza o voucher
      await tx.paymentVoucher.update({
        where: { id: voucher.id },
        data: {
          status: 'COMPLETED',
          payerId,
          paidAt: new Date(),
          transactionId: paymentTransaction.id
        }
      })

      return { paymentTransaction }
    })

    // 4. Processa a compra do pacote (ativa o plano e distribui bônus)
    try {
      await processPackagePayment({
        userId: voucher.beneficiaryId,
        packageId: voucher.packageId,
        minerId: voucher.minerId,
        packageName: pkg.name,
        packagePrice: pkg.price,
        quantity: voucherQuantity,
        correlationID: voucher.code
      })
    } catch (error) {
      console.error('Erro ao processar compra do pacote:', error)
      // Não reverte a transação, mas registra o erro
      // O admin pode processar manualmente
    }

    // Busca informações atualizadas
    const beneficiary = await prisma.user.findUnique({
      where: { id: voucher.beneficiaryId },
      select: { name: true, email: true }
    })

    return NextResponse.json({
      success: true,
      message: 'Pagamento realizado com sucesso!',
      payment: {
        transactionId: result.paymentTransaction.id.toString(),
        amount: requiredAmount,
        quantity: voucherQuantity,
        packageName: pkg.name,
        beneficiary: beneficiary?.name,
        paidAt: result.paymentTransaction.paidAt
      }
    })

  } catch (error) {
    console.error('Erro ao processar voucher:', error)
    return NextResponse.json(
      { error: 'Erro ao processar pagamento' },
      { status: 500 }
    )
  }
}

