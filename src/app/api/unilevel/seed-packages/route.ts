import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verificar se já existem pacotes
    const existingPackages = await prisma.package.findMany()
    
    if (existingPackages.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Pacotes já existem na tabela UnilevelPackage',
        count: existingPackages.length
      })
    }

    // Pacotes padrão conforme o plano TectonMiner
    const packages = [
      {
        name: 'Átomo',
        price: 99.00,
        points: 99,
        cycleBonus: 0,
        dailyCycles: 0,
        totalCycles: 0,
        profitSharePercent: 0.50,
        binaryBonusPercent: 0,
        binaryBonusDailyLimit: 0,
        directBonus: 30.00,
        reactivationAmount: 29.90,
        reactivationBonus: 2.00,
        isActive: true,
        isUnilevel: true
      },
      {
        name: 'Núcleo',
        price: 999.00,
        points: 999,
        cycleBonus: 0,
        dailyCycles: 0,
        totalCycles: 0,
        profitSharePercent: 4.00,
        binaryBonusPercent: 0,
        binaryBonusDailyLimit: 0,
        directBonus: 200.00,
        reactivationAmount: 69.90,
        reactivationBonus: 3.00,
        isActive: true,
        isUnilevel: true
      },
      {
        name: 'Tecton',
        price: 4999.00,
        points: 4999,
        cycleBonus: 0,
        dailyCycles: 0,
        totalCycles: 0,
        profitSharePercent: 10.00,
        binaryBonusPercent: 0,
        binaryBonusDailyLimit: 0,
        directBonus: 899.00,
        reactivationAmount: 99.90,
        reactivationBonus: 5.00,
        isActive: true,
        isUnilevel: true
      }
    ]

    const createdPackages: any[] = []
    
    for (const pkg of packages) {
      const created = await prisma.package.create({
        data: pkg
      })
      createdPackages.push(created)
    }

    return NextResponse.json({
      success: true,
      message: 'Pacotes unilevel criados com sucesso',
      data: createdPackages,
      count: createdPackages.length
    })

  } catch (error) {
    console.error('❌ Erro ao criar pacotes unilevel:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar os pacotes unilevel'
      },
      { status: 500 }
    )
  }
} 