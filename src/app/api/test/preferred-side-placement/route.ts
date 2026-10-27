import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findPreferredSidePlacement } from '@/lib/preferred-side-placement'

export async function POST(request: Request) {
  try {
    const { sponsorId, userId } = await request.json()

    if (!sponsorId || !userId) {
      return NextResponse.json({ error: 'sponsorId e userId são obrigatórios' }, { status: 400 })
    }

    // Simular posicionamento baseado na preferência
    const placement = await findPreferredSidePlacement(BigInt(sponsorId))

    // Aplicar posicionamento no usuário
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        parentId: placement.parentId,
        position: placement.position,
        sponsorId: BigInt(sponsorId)
      }
    })

    return NextResponse.json({
      success: true,
      placement: {
        parentId: Number(placement.parentId),
        position: placement.position,
        path: placement.path,
        depth: placement.depth
      },
      message: 'Usuário posicionado com sucesso baseado na preferência'
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Testar com Admin e User 4
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    const user4 = await prisma.user.findFirst({ where: { email: 'user4@email.com' } })

    if (!admin || !user4) {
      return NextResponse.json({ error: 'Admin ou User 4 não encontrado' }, { status: 404 })
    }

    // Calcular onde User 4 deveria estar
    const expectedPlacement = await findPreferredSidePlacement(admin.id)

    // Verificar posição atual
    const currentPosition = {
      parentId: user4.parentId ? Number(user4.parentId) : null,
      position: user4.position
    }

    const isCorrect = 
      Number(user4.parentId || 0) === Number(expectedPlacement.parentId) &&
      user4.position === expectedPlacement.position

    return NextResponse.json({
      success: true,
      admin: {
        id: Number(admin.id),
        name: admin.name,
        preferredSide: admin.preferredSide
      },
      user4Current: {
        id: Number(user4.id),
        name: user4.name,
        parentId: currentPosition.parentId,
        position: currentPosition.position
      },
      expectedPlacement: {
        parentId: Number(expectedPlacement.parentId),
        position: expectedPlacement.position,
        path: expectedPlacement.path,
        depth: expectedPlacement.depth
      },
      verification: {
        isCorrect,
        needsCorrection: !isCorrect
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
} 