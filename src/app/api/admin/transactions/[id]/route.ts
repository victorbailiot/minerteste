import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const transactionId = parseInt(id)

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de transação inválido' },
        { status: 400 }
      )
    }

    // Buscar transação com todos os relacionamentos
    const transaction = await prisma.transaction.findUnique({
      where: { id: BigInt(transactionId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            referralCode: true,
            createdAt: true
          }
        },
        userPackages: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                points: true
              }
            }
          }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    // Formatar resposta
    const formattedTransaction = {
      id: Number(transaction.id),
      type: transaction.type,
      status: transaction.status,
      amount: Number(transaction.amount),
      description: transaction.description,
      referenceId: transaction.referenceId,
      correlationID: transaction.correlationID,
      chargeId: transaction.chargeId,
      pixBrCode: transaction.pixBrCode,
      qrCodeImage: transaction.qrCodeImage,
      customerName: transaction.customerName,
      customerEmail: transaction.customerEmail,
      customerPhone: transaction.customerPhone,
      customerCpfCnpj: transaction.customerCpfCnpj,
      expiresAt: transaction.expiresAt?.toISOString(),
      paidAt: transaction.paidAt?.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      comprovanteUrl: transaction.comprovanteUrl,
      user: transaction.user ? {
        id: Number(transaction.user.id),
        name: transaction.user.name,
        email: transaction.user.email,
        phone: transaction.user.phone,
        referralCode: transaction.user.referralCode,
        createdAt: transaction.user.createdAt.toISOString()
      } : null,
      userPackages: transaction.userPackages.map(up => ({
        id: Number(up.id),
        isActive: up.isActive,
        activatedAt: up.activatedAt.toISOString(),
        expiresAt: up.expiresAt?.toISOString(),
        completedCycles: up.completedCycles,
        package: {
          id: Number(up.package.id),
          name: up.package.name,
          price: Number(up.package.price),
          description: up.package.description,
          points: up.package.points
        }
      }))
    }

    return NextResponse.json({
      success: true,
      data: formattedTransaction
    })

  } catch (error) {
    console.error('Erro ao buscar detalhes da transação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 