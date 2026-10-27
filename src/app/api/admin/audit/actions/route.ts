import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'logs.read')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Buscar distintos actionType diretamente no banco
    const prismaAny = prisma as any
    let actionTypes: string[] = []

    try {
      if (prismaAny.adminActionAudit?.findMany) {
        const rows = await prismaAny.adminActionAudit.findMany({
          distinct: ['actionType'],
          select: { actionType: true },
          take: 100,
        })
        actionTypes = rows.map((r: any) => r.actionType)
      } else {
        // Fallback SQL
        const rows = await prisma.$queryRawUnsafe(
          'SELECT DISTINCT "actionType" FROM admin_action_audits ORDER BY "actionType"'
        ) as any[]
        actionTypes = rows.map(r => r.actionType)
      }
    } catch (e) {
      console.error('Erro ao obter actionTypes:', e)
      actionTypes = []
    }

    return NextResponse.json({ success: true, data: actionTypes })
  } catch (error) {
    console.error('Erro na rota de action types:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}


