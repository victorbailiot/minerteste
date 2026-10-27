import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  userId: z.string().transform(val => BigInt(val))
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { userId } = querySchema.parse(Object.fromEntries(searchParams))

    // Buscar o usuário unilevel
    const unilevelUser = await prisma.unilevelUser.findUnique({
      where: { userId },
      include: {
        user: true
      }
    })

    if (!unilevelUser) {
      return NextResponse.json({
        success: true,
        hasActivePackage: false,
        data: null,
        message: 'Usuário não encontrado no sistema unilevel'
      })
    }

    // Buscar pacotes ativos do usuário
    const activePackages = await prisma.userPackage.findMany({
      where: { 
        userId,
        isActive: true,
        isUnilevel: true
      },
      include: {
        package: true
      },
      orderBy: {
        activatedAt: 'desc'
      }
    })

    if (activePackages.length === 0) {
      return NextResponse.json({
        success: true,
        hasActivePackage: false,
        data: null,
        message: 'Usuário não possui pacote ativo'
      })
    }

    const activePackage = activePackages[0]

    return NextResponse.json({
      success: true,
      hasActivePackage: true,
      data: [{
        id: Number(activePackage.id),
        name: activePackage.package.name,
        price: Number(activePackage.package.price),
        isActive: activePackage.isActive,
        activatedAt: activePackage.activatedAt.toISOString(),
        expiresAt: activePackage.expiresAt?.toISOString() || null,
        package: {
          id: Number(activePackage.package.id),
          name: activePackage.package.name,
          price: Number(activePackage.package.price),
          points: activePackage.package.points,
          directBonus: Number(activePackage.package.directBonus),
          profitSharePercent: Number(activePackage.package.profitSharePercent),
          reactivationAmount: Number(activePackage.package.reactivationAmount),
          reactivationBonus: Number(activePackage.package.reactivationBonus)
        }
      }],
      message: 'Pacote ativo encontrado'
    })

  } catch (error) {
    console.error('❌ Erro ao buscar pacote ativo unilevel:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar o pacote ativo'
      },
      { status: 500 }
    )
  }
} 