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

    const cycles = await prisma.cycle.findMany({
      where: { userId: userId },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        packageId: true,
        leftPointsUsed: true,
        rightPointsUsed: true,
        totalPointsUsed: true,
        bonusAmount: true,
        completedAt: true
      }
    })

    // Buscar informações dos pacotes separadamente
    const packageIds = [...new Set(cycles.map(cycle => cycle.packageId))]
    const packages = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: {
        id: true,
        name: true,
        cycleBonus: true
      }
    })

    const packagesMap = new Map(packages.map(pkg => [pkg.id, pkg]))

    const formattedCycles = cycles.map(cycle => ({
      ...cycle,
      id: Number(cycle.id),
      packageId: Number(cycle.packageId),
      bonusAmount: Number(cycle.bonusAmount),
      package: packagesMap.get(cycle.packageId) ? {
        name: packagesMap.get(cycle.packageId)!.name,
        cycleBonus: Number(packagesMap.get(cycle.packageId)!.cycleBonus)
      } : null,
      completedAt: cycle.completedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedCycles
    })

  } catch (error) {
    console.error('Erro ao buscar ciclos:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 