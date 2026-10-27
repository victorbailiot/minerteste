import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { getUserBlacklist } from '@/lib/blacklist'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const requestUserId = BigInt(user.id)
    const canView = await hasPermission(requestUserId, 'blacklist.view')
    
    if (!canView) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const targetUserId = BigInt(params.userId)
    const entries = await getUserBlacklist(targetUserId)

    // Formatar IDs para string
    const formattedEntries = entries.map(entry => ({
      ...entry,
      id: entry.id.toString(),
      addedBy: {
        ...entry.addedBy,
        id: entry.addedBy.id.toString()
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        userId: params.userId,
        entries: formattedEntries
      }
    })
  } catch (error) {
    console.error('Erro ao buscar blacklist do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar blacklist do usuário' },
      { status: 500 }
    )
  }
}
