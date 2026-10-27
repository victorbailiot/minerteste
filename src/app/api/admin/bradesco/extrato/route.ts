import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { getBradescoConfig } from '@/lib/bradesco/config'
import { consultarExtratoConta, formatBradescoDataParam } from '@/lib/bradesco/contas-service'
import { BradescoPixError } from '@/lib/bradesco/errors'

/** Aceita DD-MM-YYYY (ex.: 01-04-2026 → 01042026 na API Bradesco) ou YYYY-MM-DD. */
const dataQuery = z
  .string()
  .refine(
    (s) => /^\d{2}-\d{2}-\d{4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s),
    'Use DD-MM-YYYY (ex.: 01-04-2026) ou YYYY-MM-DD'
  )

const querySchema = z.object({
  dataInicio: dataQuery,
  dataFim: dataQuery,
  tipo: z.string().min(1).max(8).optional().default('cc'),
  agencia: z.string().regex(/^\d{1,5}$/).optional(),
  conta: z.string().regex(/^\d{1,12}$/).optional(),
})

type CalDate = { y: number; m: number; d: number }

const parseQueryDate = (s: string): CalDate => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map((n) => Number.parseInt(n, 10))
    return { y, m, d }
  }
  const [d, m, y] = s.split('-').map((n) => Number.parseInt(n, 10))
  return { y, m, d }
}

const calDateToBradescoParam = ({ y, m, d }: CalDate): string =>
  `${String(d).padStart(2, '0')}${String(m).padStart(2, '0')}${y}`

const compareCalDate = (a: CalDate, b: CalDate): number => {
  if (a.y !== b.y) return a.y - b.y
  if (a.m !== b.m) return a.m - b.m
  return a.d - b.d
}

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!(await hasPermission(userId, 'financial.read'))) {
      return NextResponse.json({ error: 'Sem permissão para consultar dados bancários' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      dataInicio: searchParams.get('dataInicio') ?? '',
      dataFim: searchParams.get('dataFim') ?? '',
      tipo: searchParams.get('tipo') ?? undefined,
      agencia: searchParams.get('agencia') ?? undefined,
      conta: searchParams.get('conta') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { dataInicio, dataFim, tipo } = parsed.data
    const inicioCal = parseQueryDate(dataInicio)
    const fimCal = parseQueryDate(dataFim)
    if (compareCalDate(inicioCal, fimCal) > 0) {
      return NextResponse.json(
        { error: 'dataInicio não pode ser maior que dataFim' },
        { status: 400 }
      )
    }

    const config = getBradescoConfig()
    // Sandbox Bradesco tem dados mockados apenas para datas específicas.
    // Qualquer outra combinação retorna 404 "Erro de estrutura".
    const sandboxDefaults =
      config.environment === 'sandbox'
        ? { agencia: '3750', conta: '75557', dataInicio: new Date(2024, 10, 6), dataFim: new Date(2024, 10, 20) }
        : null
    const agencia = sandboxDefaults?.agencia ?? parsed.data.agencia ?? config.pagadorAgencia?.trim()
    const conta = sandboxDefaults?.conta ?? parsed.data.conta ?? config.pagadorConta?.trim()
    const extratoInicio =
      sandboxDefaults?.dataInicio != null
        ? formatBradescoDataParam(sandboxDefaults.dataInicio)
        : calDateToBradescoParam(inicioCal)
    const extratoFim =
      sandboxDefaults?.dataFim != null
        ? formatBradescoDataParam(sandboxDefaults.dataFim)
        : calDateToBradescoParam(fimCal)

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
    console.log(
      `\n[admin/bradesco/extrato] ============ cURL ============\n` +
        `curl -X GET '${contasBaseUrl}/fornecimento-extratos-contas/extratos?agencia=${agencia}&conta=${conta}&tipo=${tipo}&dataInicio=${extratoInicio}&dataFim=${extratoFim}' \\\n` +
        `  -H 'Authorization: <ACCESS_TOKEN>' \\\n` +
        `  -H 'Accept: application/json' \\\n` +
        `  -H 'Content-Type: application/json'\n` +
        `[admin/bradesco/extrato] ====================================\n`
    )

    console.log('extratoInicio', extratoInicio)
    console.log('extratoFim', extratoFim)

    const data = await consultarExtratoConta({
      agencia,
      conta,
      tipo,
      dataInicio: extratoInicio,
      dataFim: extratoFim,
    })
    
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.log('err', JSON.stringify(err, null, 2))
    if (err instanceof BradescoPixError) {
      const status = err.httpStatus >= 400 ? err.httpStatus : 422
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    const message = err instanceof Error ? err.message : 'Erro ao consultar extrato'
    console.error('[admin/bradesco/extrato]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
