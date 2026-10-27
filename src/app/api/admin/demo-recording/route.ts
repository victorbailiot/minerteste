import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import {
  DemoError,
  cleanupDemoData,
  createDemoAccount,
  getDemoGuardError,
  getDemoStatus,
  prepareVideo,
} from '@/lib/demo-recording/server'

export const dynamic = 'force-dynamic'

const PERMISSION = 'demo.manage'

async function authorize(request: NextRequest): Promise<NextResponse | null> {
  const guardError = getDemoGuardError(request)
  if (guardError) {
    return NextResponse.json({ error: guardError, disabled: true }, { status: 403 })
  }
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  if (!await hasPermission(BigInt(authUser.id), PERMISSION)) {
    return NextResponse.json({ error: `Permissão necessária: ${PERMISSION}` }, { status: 403 })
  }
  return null
}

function serialize(data: unknown) {
  return JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)))
}

export async function GET(request: NextRequest) {
  const denied = await authorize(request)
  if (denied) return denied

  try {
    return NextResponse.json({ success: true, data: serialize(await getDemoStatus()) })
  } catch (error) {
    console.error('Erro ao consultar dados de demonstração:', error)
    return NextResponse.json({ error: 'Erro ao consultar dados de demonstração' }, { status: 500 })
  }
}

/**
 * POST /api/admin/demo-recording
 * { action: 'create-account', name, password } | { action: 'prepare', video } | { action: 'cleanup' }
 */
export async function POST(request: NextRequest) {
  const denied = await authorize(request)
  if (denied) return denied

  try {
    const body = await request.json()

    switch (body.action) {
      case 'create-account': {
        const name = String(body.name || '').trim() || 'Mariana Costa'
        const account = await createDemoAccount(name, String(body.password || ''))
        return NextResponse.json({ success: true, data: account })
      }
      case 'prepare': {
        const log = await prepareVideo(Number(body.video))
        return NextResponse.json({ success: true, data: { log } })
      }
      case 'cleanup': {
        const counts = await cleanupDemoData()
        return NextResponse.json({ success: true, data: counts })
      }
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof DemoError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro na ferramenta de gravação:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao preparar dados de demonstração' },
      { status: 500 }
    )
  }
}
