import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateVoucher } from '@/lib/voucher-utils'

/**
 * GET /api/vouchers/[code]
 * Consulta informações de um voucher pelo código
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { code } = await params

    if (!code || code.length < 10) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      )
    }

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

    // Busca informações do beneficiário
    const beneficiary = await prisma.user.findUnique({
      where: { id: voucher.beneficiaryId },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Busca informações do pacote
    const pkg = await prisma.package.findUnique({
      where: { id: voucher.packageId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        points: true,
        isActive: true
      }
    })

    if (!pkg) {
      return NextResponse.json(
        { error: 'Pacote não encontrado' },
        { status: 404 }
      )
    }

    if (!pkg.isActive) {
      return NextResponse.json(
        { error: 'Este pacote não está mais disponível' },
        { status: 400 }
      )
    }

    // Valida o voucher
    const validation = validateVoucher(voucher)

    // Verifica se o usuário atual é o beneficiário
    const isBeneficiary = BigInt(session.user.id) === voucher.beneficiaryId

    // Se já foi pago, busca informações do pagador
    let payerData: { id: string; name: string; email: string } | null = null
    if (voucher.payerId) {
      const payerInfo = await prisma.user.findUnique({
        where: { id: voucher.payerId },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
      
      if (payerInfo) {
        payerData = {
          id: payerInfo.id.toString(),
          name: payerInfo.name,
          email: payerInfo.email
        }
      }
    }

    return NextResponse.json({
      success: true,
      voucher: {
        id: voucher.id.toString(),
        code: voucher.code,
        amount: Number(voucher.amount),
        quantity: voucher.quantity || 1,
        description: voucher.description,
        status: voucher.status,
        expiresAt: voucher.expiresAt,
        paidAt: voucher.paidAt,
        createdAt: voucher.createdAt,
        isValid: validation.valid,
        validationError: validation.error,
        isBeneficiary
      },
      beneficiary: beneficiary ? {
        id: beneficiary.id.toString(),
        name: beneficiary.name,
        email: beneficiary.email
      } : null,
      package: {
        id: pkg.id.toString(),
        name: pkg.name,
        description: pkg.description,
        price: Number(pkg.price),
        points: pkg.points
      },
      payer: payerData
    })

  } catch (error) {
    console.error('Erro ao consultar voucher:', error)
    return NextResponse.json(
      { error: 'Erro ao consultar voucher' },
      { status: 500 }
    )
  }
}

