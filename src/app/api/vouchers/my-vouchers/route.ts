import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/vouchers/my-vouchers
 * Lista todos os vouchers do usuário (criados e pagos)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all' // 'created', 'paid', 'all'

    let whereClause: any = {}

    if (type === 'created') {
      whereClause = { beneficiaryId: userId }
    } else if (type === 'paid') {
      whereClause = { payerId: userId }
    } else {
      whereClause = {
        OR: [
          { beneficiaryId: userId },
          { payerId: userId }
        ]
      }
    }

    // Busca os vouchers
    const vouchers = await prisma.paymentVoucher.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50 // Limita a 50 vouchers mais recentes
    })

    // Busca informações relacionadas
    const beneficiaryIds = [...new Set(vouchers.map(v => v.beneficiaryId))]
    const payerIds = [...new Set(vouchers.map(v => v.payerId).filter(Boolean) as bigint[])]
    const packageIds = [...new Set(vouchers.map(v => v.packageId))]

    const [beneficiaries, payers, packages] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: beneficiaryIds } },
        select: { id: true, name: true, email: true }
      }),
      prisma.user.findMany({
        where: { id: { in: payerIds } },
        select: { id: true, name: true, email: true }
      }),
      prisma.package.findMany({
        where: { id: { in: packageIds } },
        select: { id: true, name: true, price: true }
      })
    ])

    // Monta o resultado
    const vouchersWithDetails = vouchers.map(voucher => {
      const beneficiary = beneficiaries.find(b => b.id === voucher.beneficiaryId)
      const payer = payers.find(p => voucher.payerId && p.id === voucher.payerId)
      const pkg = packages.find(p => p.id === voucher.packageId)

      const isCreator = voucher.beneficiaryId === userId
      const isPayer = voucher.payerId === userId
      const now = new Date()
      const isExpired = now > voucher.expiresAt
      const isValid = voucher.status === 'PENDING' && !isExpired

      return {
        id: voucher.id.toString(),
        code: voucher.code,
        amount: Number(voucher.amount),
        quantity: voucher.quantity || 1,
        description: voucher.description,
        status: voucher.status,
        expiresAt: voucher.expiresAt,
        paidAt: voucher.paidAt,
        createdAt: voucher.createdAt,
        isCreator,
        isPayer,
        isExpired,
        isValid,
        beneficiary: beneficiary ? {
          id: beneficiary.id.toString(),
          name: beneficiary.name,
          email: beneficiary.email
        } : null,
        payer: payer ? {
          id: payer.id.toString(),
          name: payer.name,
          email: payer.email
        } : null,
        package: pkg ? {
          id: pkg.id.toString(),
          name: pkg.name,
          price: Number(pkg.price)
        } : null
      }
    })

    // Estatísticas
    const stats = {
      total: vouchersWithDetails.length,
      pending: vouchersWithDetails.filter(v => v.status === 'PENDING' && !v.isExpired).length,
      completed: vouchersWithDetails.filter(v => v.status === 'COMPLETED').length,
      expired: vouchersWithDetails.filter(v => v.isExpired).length,
      cancelled: vouchersWithDetails.filter(v => v.status === 'CANCELLED').length,
      created: vouchersWithDetails.filter(v => v.isCreator).length,
      paid: vouchersWithDetails.filter(v => v.isPayer).length
    }

    return NextResponse.json({
      success: true,
      vouchers: vouchersWithDetails,
      stats
    })

  } catch (error) {
    console.error('Erro ao listar vouchers:', error)
    return NextResponse.json(
      { error: 'Erro ao listar vouchers' },
      { status: 500 }
    )
  }
}

