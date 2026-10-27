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

    const pointsHistory = await prisma.userPointsHistory.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        points: true,
        packageValue: true,
        side: true,
        sourceUserId: true,
        sourcePackageId: true,
        description: true,
        createdAt: true,
        sourceUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sourcePackage: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    })

    const formattedHistory = pointsHistory.map(record => ({
      ...record,
      id: Number(record.id),
      packageValue: Number(record.packageValue),
      sourceUserId: record.sourceUserId ? Number(record.sourceUserId) : null,
      sourcePackageId: record.sourcePackageId ? Number(record.sourcePackageId) : null,
      sourceUser: record.sourceUser ? {
        ...record.sourceUser,
        id: Number(record.sourceUser.id)
      } : null,
      sourcePackage: record.sourcePackage ? {
        ...record.sourcePackage,
        id: Number(record.sourcePackage.id),
        price: Number(record.sourcePackage.price)
      } : null,
      createdAt: record.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedHistory
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de pontos:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 