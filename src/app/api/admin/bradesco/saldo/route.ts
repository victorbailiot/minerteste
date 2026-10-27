import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { getBradescoConfig } from '@/lib/bradesco/config'
import { consultarSaldoConta } from '@/lib/bradesco/contas-service'
import { BradescoPixError } from '@/lib/bradesco/errors'

const querySchema = z.object({
  agencia: z.string().regex(/^\d{1,5}$/).optional(),
  conta: z.string().regex(/^\d{1,12}$/).optional(),
})

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const financialOk = await hasPermission(userId, 'financial.read')
    if (!financialOk) {
      return NextResponse.json({ error: 'Sem permissão para consultar dados bancários' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      agencia: searchParams.get('agencia') ?? undefined,
      conta: searchParams.get('conta') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos: agência e conta devem conter apenas dígitos.' },
        { status: 400 }
      )
    }

    const config = getBradescoConfig()
    const sandboxDefaults =
      config.environment === 'sandbox'
        ? {
            agencia: '3995',
            conta: '75557',
          }
        : null
    const agencia = sandboxDefaults?.agencia ?? parsed.data.agencia ?? config.pagadorAgencia?.trim()
    const conta = sandboxDefaults?.conta ?? parsed.data.conta ?? config.pagadorConta?.trim()

    if (!agencia || !conta) {
      return NextResponse.json(
        {
          error:
            'Defina BRADESCO_PAGADOR_AGENCIA e BRADESCO_PAGADOR_CONTA no ambiente ou envie agencia e conta na query.',
        },
        { status: 400 }
      )
    }

    const contasBaseUrl = (config.contasApiBaseUrl ?? '').replace(/\/$/, '')
    const curlQuery = new URLSearchParams({
      agencia,
      conta,
    })
    const curlUrl = `${contasBaseUrl}/fornecimento-saldos-contas/saldos?${curlQuery.toString()}`
    console.log(
      `\n[admin/bradesco/saldo] ============ cURL ============\n` +
        `curl -X GET '${curlUrl}' \\\n` +
        `  -H 'Authorization: <ACCESS_TOKEN>' \\\n` +
        `  -H 'Accept: application/json' \\\n` +
        `  -H 'Content-Type: application/json'\n` +
        `[admin/bradesco/saldo] ====================================\n`
    )

    const data = await consultarSaldoConta({
      agencia,
      conta,
    })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (err instanceof BradescoPixError) {
      const status = err.httpStatus >= 400 ? err.httpStatus : 422
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    const message = err instanceof Error ? err.message : 'Erro ao consultar saldo'
    console.error('[admin/bradesco/saldo]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
