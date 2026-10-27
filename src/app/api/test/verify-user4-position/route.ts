import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Buscar User 4 e Admin
    const user4 = await prisma.user.findFirst({
      where: { email: 'user4@email.com' },
      select: {
        id: true,
        name: true,
        email: true,
        parentId: true,
        position: true,
        sponsorId: true
      }
    })

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        preferredSide: true
      }
    })

    const user1 = await prisma.user.findFirst({
      where: { email: 'user1@email.com' },
      select: {
        id: true,
        name: true
      }
    })

    // Verificar se a posição está correta
    const isPositionCorrect = user4 && user1 && 
      Number(user4.parentId || 0) === Number(user1.id) &&
      user4.position === 'RIGHT'

    const isSponsorCorrect = user4 && admin &&
      Number(user4.sponsorId || 0) === Number(admin.id)

    return NextResponse.json({
      success: true,
      user4: user4 ? {
        id: Number(user4.id),
        name: user4.name,
        parentId: user4.parentId ? Number(user4.parentId) : null,
        position: user4.position,
        sponsorId: user4.sponsorId ? Number(user4.sponsorId) : null
      } : null,
      expected: {
        parentId: user1 ? Number(user1.id) : null,
        position: 'RIGHT',
        sponsorId: admin ? Number(admin.id) : null
      },
      verification: {
        positionCorrect: isPositionCorrect,
        sponsorCorrect: isSponsorCorrect,
        overallCorrect: isPositionCorrect && isSponsorCorrect
      },
      adminPreference: admin?.preferredSide || null,
      explanation: [
        `Admin preferredSide: ${admin?.preferredSide}`,
        "Busca recursiva à direita:",
        "1. Admin → RIGHT → User 3 (ocupado)",  
        "2. User 3 → RIGHT → User 1 (ocupado)",
        "3. User 1 → RIGHT → VAZIO ✓",
        `User 4 deve ter parentId=${user1 ? Number(user1.id) : 'N/A'} e position=RIGHT`
      ]
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
} 