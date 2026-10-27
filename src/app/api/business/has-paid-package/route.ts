import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const userIdBigInt = BigInt(userId)

    // Buscar apenas transações de compra completadas
    const purchaseTransaction = await prisma.transaction.findFirst({
      where: {
        userId: userIdBigInt,
        type: 'PURCHASE',
        status: 'COMPLETED'
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true
      }
    })

    const hasPaidPackage = !!purchaseTransaction

    return NextResponse.json({
      success: true,
      data: {
        hasPaidPackage,
        purchaseTransaction: hasPaidPackage ? {
          id: Number(purchaseTransaction.id),
          type: purchaseTransaction.type,
          status: purchaseTransaction.status,
          createdAt: purchaseTransaction.createdAt.toISOString()
        } : null
      }
    })

  } catch (error) {
    console.error('Erro ao verificar pacote pago:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 