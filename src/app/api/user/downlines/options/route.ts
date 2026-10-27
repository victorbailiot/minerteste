import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const [careerLevels, packages] = await Promise.all([
      prisma.careerLevel.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { requiredPoints: 'asc' }
      }),
      prisma.package.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: 'asc' }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        graduations: ['Sem graduação', ...careerLevels.map((c) => c.name)],
        packages: packages.map((p) => p.name),
        levels: Array.from({ length: 20 }, (_, i) => i + 1),
        statuses: ['Ativo', 'Inativo']
      }
    })
  } catch (error) {
    console.error('Erro ao buscar opções de filtro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
