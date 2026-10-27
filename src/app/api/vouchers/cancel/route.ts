import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validação
const cancelVoucherSchema = z.object({
  code: z.string().min(10)
})

/**
 * POST /api/vouchers/cancel
 * Cancela um voucher (apenas o criador pode cancelar)
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
    const validation = cancelVoucherSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { code } = validation.data
    const userId = BigInt(session.user.id)

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

    // Verifica se o usuário é o criador do voucher
    if (voucher.beneficiaryId !== userId) {
      return NextResponse.json(
        { error: 'Apenas o criador pode cancelar este voucher' },
        { status: 403 }
      )
    }

    // Verifica se o voucher já foi pago
    if (voucher.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Não é possível cancelar um voucher já pago' },
        { status: 400 }
      )
    }

    // Verifica se já está cancelado
    if (voucher.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Este voucher já está cancelado' },
        { status: 400 }
      )
    }

    // Cancela o voucher
    const updatedVoucher = await prisma.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Voucher cancelado com sucesso',
      voucher: {
        id: updatedVoucher.id.toString(),
        code: updatedVoucher.code,
        status: updatedVoucher.status
      }
    })

  } catch (error) {
    console.error('Erro ao cancelar voucher:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar voucher' },
      { status: 500 }
    )
  }
}

