/**
 * API Route para gerenciar transações
 * GET /api/transactions - Lista transações (com filtros opcionais)
 * GET /api/transactions?userId=123 - Lista transações de um usuário específico
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createUserPackage } from '@/lib/business-logic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const packageId = searchParams.get('packageId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    
    if (userId) {
      where.userId = BigInt(userId)
    }
    
    if (status) {
      where.status = status
    }
    
    if (type) {
      where.type = type
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        // incluir o final do dia quando somente data é passada
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999)
          where.createdAt.lte = end
        }
      }
    }
    
    // Removido filtro por packageId pois agora os pacotes são relacionados via UserPackage

    // Buscar transações com userPackages incluídos
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          sourceUser: {
            select: { id: true, name: true, email: true }
          },
          userPackages: {
            include: {
              package: {
                select: { id: true, name: true, price: true, description: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where })
    ])

    // Formatar resposta
    const formattedTransactions = transactions.map(transaction => ({
      id: Number(transaction.id),
      userId: transaction.userId ? Number(transaction.userId) : null,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      correlationID: transaction.correlationID,
      chargeId: transaction.chargeId,
      status: transaction.status,
      customerName: transaction.customerName,
      customerEmail: transaction.customerEmail,
      customerPhone: transaction.customerPhone,
      customerCpfCnpj: transaction.customerCpfCnpj,
      expiresAt: transaction.expiresAt,
      paidAt: transaction.paidAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      level: transaction.level,
      sourceUserId: transaction.sourceUserId ? Number(transaction.sourceUserId) : null,
      sourceUser: transaction.sourceUser ? {
        id: Number(transaction.sourceUser.id),
        name: transaction.sourceUser.name,
        email: transaction.sourceUser.email
      } : null,
      user: transaction.user,
      userPackages: transaction.userPackages.map(up => ({
        id: Number(up.id),
        packageId: Number(up.packageId),
        isActive: up.isActive,
        package: up.package
      }))
    }))

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar as transações' 
      },
      { status: 500 }
    )
  }
}

// Endpoint para atualizar status de uma transação (útil para webhooks)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionId, status, paidAt } = body

    if (!transactionId || !status) {
      return NextResponse.json(
        { error: 'transactionId e status são obrigatórios' },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.update({
      where: { id: BigInt(transactionId) },
      data: {
        status,
        paidAt: paidAt ? new Date(paidAt) : null,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        userPackages: {
          include: {
            package: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(transaction.id),
        status: transaction.status,
        paidAt: transaction.paidAt,
        updatedAt: transaction.updatedAt,
        user: transaction.user
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar transação:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível atualizar a transação' 
      },
      { status: 500 }
    )
  }
} 