import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateVoucherCode } from '@/lib/voucher-utils'
import { isBlacklisted } from '@/lib/blacklist'
import { z } from 'zod'
import { validatePackageForMinerPurchase } from '@/lib/package-purchase-validator'

// Schema de validação
const generateVoucherSchema = z.object({
  packageId: z.number().int().positive(),
  minerId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  description: z.string().optional(),
  validityHours: z.number().int().positive().default(48)
})

/**
 * POST /api/vouchers/generate
 * Gera um novo voucher de pagamento solidário
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
    const validation = generateVoucherSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { packageId, minerId, quantity, description, validityHours } = validation.data
    const userId = BigInt(session.user.id)
    const packageIdBigInt = BigInt(packageId)
    const minerIdBigInt = BigInt(minerId)

    // Verificar se o beneficiário está na blacklist para pagamento com crédito minerador
    const blacklistCheck = await isBlacklisted(userId, 'pay_package_miner_credit', 'pay')
    if (blacklistCheck.blocked) {
      return NextResponse.json(
        { error: blacklistCheck.reason || 'Você não está autorizado a usar crédito minerador para pacotes.' },
        { status: 403 }
      )
    }

    const packageValidation = await validatePackageForMinerPurchase({
      userId,
      packageId: packageIdBigInt,
      minerId: minerIdBigInt
    })

    if (!packageValidation.valid || !packageValidation.packageData) {
      return NextResponse.json(
        { error: packageValidation.error || 'Pacote inválido para a mineradora selecionada' },
        { status: 400 }
      )
    }
    const pkg = packageValidation.packageData

    // Verifica se o usuário já tem um voucher pendente para este pacote com a mesma quantidade
    const existingVoucher = await prisma.paymentVoucher.findFirst({
      where: {
        beneficiaryId: userId,
        packageId: packageIdBigInt,
        minerId: minerIdBigInt,
        quantity,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })

    if (existingVoucher) {
      return NextResponse.json(
        { 
          error: 'Você já possui um voucher pendente para este pacote com esta quantidade',
          existingCode: existingVoucher.code
        },
        { status: 409 }
      )
    }

    // Gera código único
    const code = await generateVoucherCode()

    // Calcula data de expiração
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + validityHours)

    // Calcula valor total (preço unitário * quantidade)
    const totalAmount = pkg.price.mul(quantity)

    // Cria o voucher
    const voucher = await prisma.paymentVoucher.create({
      data: {
        code,
        beneficiaryId: userId,
        packageId: packageIdBigInt,
        minerId: minerIdBigInt,
        amount: totalAmount,
        quantity,
        description: description || `Crédito Minerador - ${quantity}x ${pkg.name}`,
        expiresAt,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      voucher: {
        id: voucher.id.toString(),
        code: voucher.code,
        amount: Number(voucher.amount),
        quantity: voucher.quantity,
        packageName: pkg.name,
        description: voucher.description,
        expiresAt: voucher.expiresAt,
        createdAt: voucher.createdAt
      },
      message: 'Voucher gerado com sucesso! Compartilhe o código com quem irá pagar.'
    })

  } catch (error) {
    console.error('Erro ao gerar voucher:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar voucher' },
      { status: 500 }
    )
  }
}

