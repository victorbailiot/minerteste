import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { getAllResources, getFlatBlacklistOptions } from '@/lib/constants/blacklist-resources'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const canView = await hasPermission(userId, 'blacklist.view')
    
    if (!canView) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const resources = getAllResources()
    const options = getFlatBlacklistOptions()

    return NextResponse.json({
      success: true,
      data: { resources, options }
    })
  } catch (error) {
    console.error('Erro ao buscar recursos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar recursos' },
      { status: 500 }
    )
  }
}
