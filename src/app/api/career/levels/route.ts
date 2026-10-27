import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Retorna lista de níveis de carreira para dropdowns e filtros.
 * Requer autenticação.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const levels = await prisma.careerLevel.findMany({
      orderBy: { requiredPoints: 'asc' },
      select: {
        id: true,
        name: true
      }
    })

    return NextResponse.json({
      success: true,
      levels: levels.map((l) => ({ id: String(l.id), name: l.name }))
    })
  } catch (error) {
    console.error('Erro ao buscar níveis de carreira:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
