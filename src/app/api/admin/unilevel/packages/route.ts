import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem executar esta operação.' },
        { status: 403 }
      )
    }

    // Buscar pacotes unilevel ativos
    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
        isUnilevel: true
      },
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        points: true,
        directBonus: true,
        profitSharePercent: true,
        reactivationAmount: true,
        reactivationBonus: true
      }
    })

    // Formatar resposta
    const formattedPackages = packages.map(pkg => ({
      id: pkg.id.toString(),
      name: pkg.name,
      price: pkg.price.toString(),
      points: pkg.points,
      directBonus: pkg.directBonus.toString(),
      profitSharePercent: pkg.profitSharePercent.toString(),
      reactivationAmount: pkg.reactivationAmount.toString(),
      reactivationBonus: pkg.reactivationBonus.toString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedPackages
    })

  } catch (error) {
    console.error('❌ Erro ao buscar pacotes unilevel:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
