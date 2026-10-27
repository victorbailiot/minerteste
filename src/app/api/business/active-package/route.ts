import { NextRequest, NextResponse } from 'next/server'
import { getUserLastActivePackage } from '@/lib/business-logic'
import { getUserActivePackage } from '@/lib/business-utils'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const userIdBigInt = BigInt(userId)

    // Buscar o último pacote ativo do usuário
    const activePackage = await getUserActivePackage(userIdBigInt)
    
    if (!activePackage) {
      return NextResponse.json({
        success: true,
        data: {
          hasActivePackage: false,
          activePackage: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      hasActivePackage: true,
      data: [{
        id: Number(activePackage.id),
        name: activePackage.name,
        price: Number(activePackage.price),
        isActive: activePackage.isActive,
        activatedAt: activePackage.activatedAt.toISOString(),
        expiresAt: activePackage.expiresAt?.toISOString() || null,
        package: {
          id: Number(activePackage.id),
          name: activePackage.name,
          description: activePackage.description,
          price: Number(activePackage.price),
          points: activePackage.points,
          profitSharePercent: Number(activePackage.profitSharePercent),
          isUnilevel: activePackage.isUnilevel,
          directBonus: Number(activePackage.directBonus),
          reactivationAmount: Number(activePackage.reactivationAmount),
          reactivationBonus: Number(activePackage.reactivationBonus)
        }
      }]
    })

  } catch (error) {
    console.error('Erro ao buscar pacote ativo:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 