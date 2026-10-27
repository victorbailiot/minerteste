import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const careerLevelName = decodeURIComponent(name)

    const careerLevel = await prisma.careerLevel.findFirst({
      where: {
        name: {
          equals: careerLevelName,
          mode: 'insensitive'
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        requiredPoints: true,
        maxTeamVolumePercent: true,
        indirectBonusLevels: true,
        reactivationLevels: true,
        extraProfitPercent: true,
        travelBonus: true,
        travelValue: true,
        pinImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        requiredDirects: true,
        careerBonusAmount: true,
        careerPrizeDescription: true,
        careerPrizeValue: true,
        flyers: {
          select: {
            id: true,
            textColor: true,
            backgroundImage: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!careerLevel) {
      return NextResponse.json(
        { error: 'Nível de carreira não encontrado' },
        { status: 404 }
      )
    }

    const response = {
      ...careerLevel,
      flyer: careerLevel.flyers && careerLevel.flyers.length > 0 ? careerLevel.flyers[0] : null
    }

    // Remover coleção completa para evitar confusão
    // @ts-expect-error removendo propriedade apenas na resposta
    delete response.flyers

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao buscar nível de carreira:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
