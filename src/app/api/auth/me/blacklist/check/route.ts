import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { isBlacklisted } from '@/lib/blacklist'

/**
 * GET /api/auth/me/blacklist/check?resource=...&action=...
 * Verifica se o usuário autenticado está bloqueado para o recurso/ação informados.
 * Usado no checkout para bloquear pagamento com bônus ou crédito minerador.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const resource = searchParams.get('resource')
    const action = searchParams.get('action') || undefined

    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro resource é obrigatório' },
        { status: 400 }
      )
    }

    const userId = BigInt(user.id)
    const result = await isBlacklisted(userId, resource, action)

    return NextResponse.json({
      success: true,
      data: {
        blocked: result.blocked,
        reason: result.reason ?? null
      }
    })
  } catch (error) {
    console.error('Erro ao verificar blacklist:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar blacklist' },
      { status: 500 }
    )
  }
}
