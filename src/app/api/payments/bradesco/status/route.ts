/**
 * GET /api/payments/bradesco/status?idtransacao=...&e2eid=...
 * Consulta o status de uma transferência Pix via Bradesco
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { consultarTransferenciaPix } from '@/lib/bradesco-pix-service'

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const idtransacao = searchParams.get('idtransacao')
  const e2eid = searchParams.get('e2eid')

  if (!idtransacao || !e2eid) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios ausentes: idtransacao e e2eid' },
      { status: 400 }
    )
  }

  if (idtransacao.length > 35) {
    return NextResponse.json(
      { error: 'idtransacao deve ter no máximo 35 caracteres' },
      { status: 400 }
    )
  }

  const result = await consultarTransferenciaPix(idtransacao, e2eid)

  if (!result.success) {
    const status = result.error?.httpStatus ?? 500
    return NextResponse.json(
      {
        error: result.error?.message ?? 'Erro ao consultar transferência',
        codigo: result.error?.code,
      },
      { status: status >= 400 && status < 600 ? status : 500 }
    )
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 200 })
}
