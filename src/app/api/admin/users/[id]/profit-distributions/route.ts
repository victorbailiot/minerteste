import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID de usuário inválido' },
        { status: 400 }
      )
    }

    const distributions = await prisma.profitDistribution.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        packageId: true,
        minerId: true,
        amount: true,
        profitPercent: true,
        totalProfit: true,
        periodStart: true,
        periodEnd: true,
        status: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
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
      }
    })

    const formattedDistributions = distributions.map(distribution => ({
      ...distribution,
      id: Number(distribution.id),
      packageId: Number(distribution.packageId),
      minerId: distribution.minerId ? Number(distribution.minerId) : null,
      amount: Number(distribution.amount),
      profitPercent: Number(distribution.profitPercent),
      totalProfit: Number(distribution.totalProfit),
      package: {
        ...distribution.package,
        profitSharePercent: Number(distribution.package.profitSharePercent)
      },
      miner: distribution.miner
        ? {
            id: Number(distribution.miner.id),
            name: distribution.miner.name
          }
        : null,
      periodStart: distribution.periodStart.toISOString(),
      periodEnd: distribution.periodEnd.toISOString(),
      processedAt: distribution.processedAt?.toISOString() || null,
      createdAt: distribution.createdAt.toISOString(),
      updatedAt: distribution.updatedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedDistributions
    })

  } catch (error) {
    console.error('Erro ao buscar distribuições de lucro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 