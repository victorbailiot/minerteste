import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processActivationPIX } from '@/lib/business-logic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const correlationID = searchParams.get('correlationID')

    if (!correlationID) {
      return NextResponse.json({
        success: false,
        error: 'CorrelationID é obrigatório'
      }, { status: 400 })
    }

    console.log('CorrelationID:', correlationID)

    // Buscar transação pelo correlationID
    const transaction = await prisma.transaction.findFirst({
      where: { correlationID },
      select: {
        id: true,
        userId: true,
        status: true,
        paidAt: true,
        type: true
      }
    })

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: 'Transação não encontrada'
      }, { status: 404 })
    }

    console.log('Transação encontrada:', transaction)

    const isPaid = transaction.status === 'COMPLETED' && transaction.paidAt !== null

    return NextResponse.json({
      success: true,
      data: {
        paid: isPaid,
        status: transaction.status,
        paidAt: transaction.paidAt
      }
    })
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 