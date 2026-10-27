/**
 * API Route para gerenciar pacotes/planos
 * GET /api/packages - Lista todos os pacotes disponíveis
 * POST /api/packages - Criar novo pacote (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')
    const includeUserCount = searchParams.get('includeUserCount') === 'true'

    // Construir filtros
    const where: any = {}
    
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    // Buscar pacotes
    const packages = await prisma.package.findMany({
      where,
      include: includeUserCount ? {
        _count: {
          select: {
            userPackages: {
              where: { isActive: true }
            }
          }
        }
      } : undefined,
      orderBy: { price: 'asc' }
    })

    // Formatar resposta
    const formattedPackages = packages.map(pkg => ({
      id: Number(pkg.id),
      name: pkg.name,
      description: pkg.description,
      price: Number(pkg.price),
      points: pkg.points,
      isActive: pkg.isActive,
      cycleBonus: Number(pkg.cycleBonus),
      dailyCycles: pkg.dailyCycles, // Adicionar limite de ciclos diário
      totalCycles: pkg.totalCycles,
      profitSharePercent: Number(pkg.profitSharePercent), // Adicionar participação de lucro
      binaryBonusPercent: Number(pkg.binaryBonusPercent), // Adicionar percentual do bônus binário
      binaryBonusDailyLimit: Number(pkg.binaryBonusDailyLimit), // Adicionar limite diário do bônus binário
      // Campos unilevel
      isUnilevel: pkg.isUnilevel,
      directBonus: Number(pkg.directBonus),
      reactivationAmount: Number(pkg.reactivationAmount),
      reactivationBonus: Number(pkg.reactivationBonus),
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      ...(includeUserCount && {
        activeUsersCount: (pkg as any)._count?.userPackages || 0
      })
    }))

    return NextResponse.json({
      success: true,
      data: formattedPackages
    })

  } catch (error) {
    console.error('Erro ao buscar pacotes:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os pacotes' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, price, points, cycleBonus, totalCycles } = body

    // Validações básicas
    if (!name || !price || !points || !cycleBonus || !totalCycles) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (price <= 0 || points <= 0 || cycleBonus <= 0 || totalCycles <= 0) {
      return NextResponse.json(
        { error: 'Valores devem ser maiores que zero' },
        { status: 400 }
      )
    }

    // Criar pacote
    const newPackage = await prisma.package.create({
      data: {
        name,
        description,
        price,
        points,
        cycleBonus,
        totalCycles,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(newPackage.id),
        name: newPackage.name,
        description: newPackage.description,
        price: Number(newPackage.price),
        points: newPackage.points,
        isActive: newPackage.isActive,
        cycleBonus: Number(newPackage.cycleBonus),
        dailyCycles: newPackage.dailyCycles, // Adicionar limite de ciclos diário
        totalCycles: newPackage.totalCycles,
        profitSharePercent: Number(newPackage.profitSharePercent), // Adicionar participação de lucro
        binaryBonusPercent: Number(newPackage.binaryBonusPercent), // Adicionar percentual do bônus binário
        binaryBonusDailyLimit: Number(newPackage.binaryBonusDailyLimit), // Adicionar limite diário do bônus binário
        // Campos unilevel
        isUnilevel: newPackage.isUnilevel,
        directBonus: Number(newPackage.directBonus),
        reactivationAmount: Number(newPackage.reactivationAmount),
        reactivationBonus: Number(newPackage.reactivationBonus),
        createdAt: newPackage.createdAt,
        updatedAt: newPackage.updatedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar pacote:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar o pacote' 
      },
      { status: 500 }
    )
  }
} 