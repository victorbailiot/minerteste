import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { processUnilevelProfitDistribution } from '@/lib/business-logic-unilevel'

// Processa distribuição de lucros baseada em vendas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { totalProfit, minerId } = body

    if (!totalProfit || !minerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: totalProfit e minerId' 
      }, { status: 400 })
    }

    if (!/^\d+$/.test(String(minerId))) {
      return NextResponse.json({
        success: false,
        error: 'minerId inválido'
      }, { status: 400 })
    }

    // Usar data atual como data de execução
    const executionDate = new Date()
    const profitAmount = new Decimal(totalProfit)
    const minerIdBigInt = BigInt(minerId)

    const miner = await prisma.miner.findUnique({
      where: { id: minerIdBigInt },
      select: { id: true, name: true }
    })

    if (!miner) {
      return NextResponse.json({
        success: false,
        error: 'Mineradora não encontrada'
      }, { status: 404 })
    }

    const distributionResult = await processUnilevelProfitDistribution(
      profitAmount,
      executionDate,
      minerIdBigInt
    )
    
    // Se houve distribuição efetiva, criar transação financeira
    if (Number(distributionResult.totalDistributed) > 0) {
      try {
        // Buscar usuário admin
        const adminUser = await prisma.user.findFirst({
          where: {
            role: 'ADMIN'
          }
        })

        if (!adminUser) {
          throw new Error('Usuário admin não encontrado')
        }

        // Criar transação financeira de saída
        await prisma.financialTransaction.create({
          data: {
            type: 'EXPENSE',
            category: 'PROFIT_DISTRIBUTION',
            description: `Divisão de lucro por vendas - ${miner.name} - ${distributionResult.distributedToUsers} usuários ativos`,
            transactionDate: new Date(),
            totalAmount: distributionResult.totalDistributed,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: adminUser.id
          }
        })
      } catch (error) {
        console.error('Erro ao criar transação financeira:', error)
        // Não vamos falhar a requisição se a transação financeira falhar
        // mas vamos registrar o erro
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Distribuição de lucros processada com sucesso',
      data: distributionResult
    })
  } catch (error) {
    console.error('Erro ao processar distribuição de lucros:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Obtém histórico de distribuições
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const minerId = searchParams.get('minerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const skip = (page - 1) * limit

    const where: { userId?: bigint; minerId?: bigint } = {}
    if (userId) where.userId = BigInt(userId)
    if (minerId) where.minerId = BigInt(minerId)

    const distributions = await prisma.profitDistribution.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        package: {
          select: {
            name: true,
            profitSharePercent: true
          }
        },
        miner: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const total = await prisma.profitDistribution.count({ where })

    return NextResponse.json({ 
      success: true, 
      data: {
        distributions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    })
  } catch (error) {
    console.error('Erro ao obter distribuições:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 