import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { getUserBlacklist } from '@/lib/blacklist'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const entries = await getUserBlacklist(userId)

    // Filtrar apenas entradas ativas e não expiradas
    const now = new Date()
    const activeEntries = entries.filter(
      entry => entry.isActive && (!entry.expiresAt || entry.expiresAt > now)
    )

    // Formatar resposta (sem expor dados sensíveis)
    const formattedEntries = activeEntries.map(entry => ({
      resource: entry.resource,
      action: entry.action,
      reason: entry.reason,
      expiresAt: entry.expiresAt
    }))

    return NextResponse.json({
      success: true,
      data: {
        entries: formattedEntries
      }
    })
  } catch (error) {
    console.error('Erro ao buscar blacklist do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar blacklist' },
      { status: 500 }
    )
  }
}
