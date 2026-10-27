import { NextRequest, NextResponse } from 'next/server'
import { blacklistCleanupJob } from '@/lib/cron/blacklist-cleanup'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

/**
 * API Route para executar manualmente a limpeza de blacklist expirada
 * GET /api/cron/blacklist-cleanup
 * 
 * Requer permissão: blacklist.manage
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar se é uma requisição do Vercel Cron (com secret)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Requisição autorizada do Vercel Cron
      const result = await blacklistCleanupJob()
      return NextResponse.json(result)
    }

    // Caso contrário, verificar permissão do usuário
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const canManage = await hasPermission(userId, 'blacklist.manage')
    
    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Executar job
    const result = await blacklistCleanupJob()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao executar limpeza de blacklist:', error)
    return NextResponse.json(
      { error: 'Erro ao executar limpeza' },
      { status: 500 }
    )
  }
}
