/**
 * POST /api/payments/bradesco/transfer
 *
 * Recebe o ID do saque (withdrawalId) + dados do pagador/transação.
 * Busca automaticamente os dados bancários do usuário no banco de dados
 * e monta o recebedor conforme exigido pela API Bradesco.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { solicitarTransferenciaPix } from '@/lib/bradesco-pix-service'
import type { PixPayer, PixReceiver } from '@/lib/bradesco/types'
import { getBradescoConfig } from '@/lib/bradesco/config'
import { normalizeBradescoIdTransacaoInput } from '@/lib/bradesco/id-transacao'
import { getActiveBankAndPix, getBradescoPagadorProductionIssue } from '@/lib/bradesco/transfer-utils'
import { prisma } from '@/lib/prisma'
import { logWithdrawalPixSent } from '@/lib/admin-audit'

/** Igual a `Transaction.description` no Prisma (`@db.VarChar(255)`). */
const TRANSACTION_DESCRIPTION_DB_MAX = 255

const buildWithdrawalDescriptionAfterPixSent = (
  current: string | null | undefined,
  e2eid: string | undefined
): string => {
  const base = current?.trim() || 'Saque'
  const suffix = ` - PIX enviado em: ${new Date().toISOString()}${e2eid ? ` (e2eid: ${e2eid})` : ''}`
  const full = base + suffix
  return full.length <= TRANSACTION_DESCRIPTION_DB_MAX
    ? full
    : full.slice(0, TRANSACTION_DESCRIPTION_DB_MAX)
}

// Mapeamento de código de banco -> ISPB (principais bancos brasileiros)
const BANK_CODE_TO_ISPB: Record<string, string> = {
  '001': '00000000', // Banco do Brasil
  '003': '04902979', // Banco da Amazônia
  '004': '07237373', // Banco do Nordeste
  '033': '90400888', // Santander
  '041': '92702067', // Banrisul
  '047': '13009717', // Banese
  '070': '00000000', // BRB (Banco de Brasília)
  '069': '61033106', // Crefisa
  '077': '00416968', // Banco Inter
  '097': '00714671', // Credisis
  '099': '01701201', // Uniprime Norte do Paraná
  '104': '00360305', // Caixa Econômica Federal
  '121': '10664513', // Agibank
  '133': '10398952', // Cresol Confederação
  '136': '00315557', // Unicred
  '197': '16501555', // Stone
  '208': '30306294', // BTG Pactual
  '212': '92894922', // Banco Original
  '218': '71027866', // BS2
  '237': '60746948', // Bradesco
  '243': '27652684', // Banco Master
  '260': '18236120', // Nubank
  '290': '08561701', // PagBank (PagSeguro)
  '318': '71371686', // Banco BMG
  '323': '10573521', // Mercado Pago
  '336': '31872495', // C6 Bank
  '341': '60701190', // Itaú Unibanco
  '380': '22896431', // PicPay
  '389': '17184037', // Banco Mercantil
  '422': '58160789', // Banco Safra
  '505': '59588111', // Credit Suisse
  '633': '68900810', // Banco Rendimento
  '643': '00122327', // Banco Pine
  '707': '01023570', // Daycoval
  '735': '08357240', // Neon
  '741': '04831810', // Ribeirão Preto
  '745': '33479023', // Citibank
  '748': '01181521', // Sicredi
  '756': '02038232', // Sicoob
  '769': '50579044', // Banco Lemmata
  '777': '17298092', // Banco Genial
  '810': '00204963', // Itaú Unibanco (variante)
  '840': '00775603', // Banco Original Agro
}

/** Mapeia accountType do Prisma para o enum da API Bradesco */
const mapAccountType = (type: string): 'CONTA_CORRENTE' | 'CONTA_POUPANCA' => {
  return type === 'savings' ? 'CONTA_POUPANCA' : 'CONTA_CORRENTE'
}

/** Mapeia PixKeyType do sistema para tipoChave da API Bradesco */
const mapPixKeyType = (
  type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
): 'CPFCNPJ' | 'EMAIL' | 'TELEFONE' | 'EVP' => {
  switch (type) {
    case 'CPF':    return 'CPFCNPJ'
    case 'CNPJ':   return 'CPFCNPJ'
    case 'EMAIL':  return 'EMAIL'
    case 'PHONE':  return 'TELEFONE'
    case 'RANDOM': return 'EVP'
  }
}


const transferBodySchema = z.object({
  withdrawalId: z.number().int().positive('ID do saque é obrigatório'),
  idtransacao: z
    .string()
    .min(1)
    .max(35)
    .transform((s) => normalizeBradescoIdTransacaoInput(s))
    .refine((s) => s.length >= 1, {
      message: 'idtransacao deve ter ao menos um caractere alfanumérico (sem hífens ou símbolos)',
    }),
  valor: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Valor deve estar no formato "100.00"'),
})

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const parsed = transferBodySchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const firstMessages = Object.entries(fieldErrors)
      .flatMap(([field, msgs]) => (msgs ?? []).map(m => `${field}: ${m}`))
    const formErrors = parsed.error.flatten().formErrors

    return NextResponse.json(
      {
        error: firstMessages[0] ?? formErrors[0] ?? 'Dados inválidos',
        detalhes: fieldErrors,
      },
      { status: 400 }
    )
  }

  const { withdrawalId, idtransacao, valor } = parsed.data

  // Pagador: sempre construído a partir do .env (empresa não precisa ser configurada pelo admin)
  const bradescoConfig = getBradescoConfig()
  let pagador: PixPayer

  if (bradescoConfig.pagadorTipoChave === 'AGENCIACONTA') {
    if (!bradescoConfig.pagadorAgencia || !bradescoConfig.pagadorConta) {
      return NextResponse.json(
        { error: 'BRADESCO_PAGADOR_AGENCIA e BRADESCO_PAGADOR_CONTA não configurados no .env' },
        { status: 500 }
      )
    }
    pagador = {
      tipoChave: 'AGENCIACONTA',
      agencia: bradescoConfig.pagadorAgencia,
      conta: bradescoConfig.pagadorConta,
    }
  } else {
    if (!bradescoConfig.pagadorChavePix) {
      return NextResponse.json(
        { error: `BRADESCO_PAGADOR_CHAVE_PIX não configurada no .env (tipo: ${bradescoConfig.pagadorTipoChave})` },
        { status: 500 }
      )
    }
    pagador = {
      tipoChave: bradescoConfig.pagadorTipoChave,
      chavePix: bradescoConfig.pagadorChavePix,
    }
  }

  const pagadorIssue = getBradescoPagadorProductionIssue(bradescoConfig.environment, pagador)
  if (pagadorIssue) {
    return NextResponse.json({ error: pagadorIssue }, { status: 400 })
  }

  // Buscar o saque e os dados bancários do usuário
  const withdrawal = await prisma.transaction.findUnique({
    where: { id: BigInt(withdrawalId) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          cpf: true,
          bankAccount: true,
          pixKey: true,
        },
      },
    },
  })

  if (!withdrawal) {
    return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
  }

  if (withdrawal.type !== 'WITHDRAWAL') {
    return NextResponse.json({ error: 'Transação não é um saque' }, { status: 400 })
  }

  if (withdrawal.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Saque não está aguardando pagamento (status inválido para PIX)' },
      { status: 400 }
    )
  }

  if (!withdrawal.description.includes(' - Aprovado em:')) {
    return NextResponse.json(
      {
        error: 'Só é possível pagar saques já aprovados pelo admin',
        detalhe: 'Aprove o saque na lista antes de enviar o PIX.',
      },
      { status: 400 }
    )
  }

  const user = withdrawal.user
  if (!user) {
    return NextResponse.json({ error: 'Usuário do saque não encontrado' }, { status: 404 })
  }

  const { bankAccount, pixKey } = getActiveBankAndPix(user.bankAccount, user.pixKey)

  if (!pixKey && !bankAccount) {
    return NextResponse.json(
      {
        error: 'Usuário não possui chave PIX nem conta bancária cadastrada',
        detalhe: 'Peça ao usuário que cadastre sua chave PIX antes de realizar o saque.',
      },
      { status: 422 }
    )
  }

  let recebedor: PixReceiver
  let recebedorResumo: { nome: string; metodo: string; detalhe: string }

  if (bankAccount) {
    // Prioridade 1: dados bancários (agência + conta) — formato AGENCIACONTA
    const bank = bankAccount
    const ispb = BANK_CODE_TO_ISPB[bank.bankCode] ?? ''

    if (!ispb) {
      return NextResponse.json(
        {
          error: `ISPB não encontrado para o código de banco "${bank.bankCode}"`,
          detalhe: 'Adicione o banco na tabela de mapeamento ISPB do sistema.',
        },
        { status: 422 }
      )
    }

    const cpfCnpj = bank.holderDocument.replace(/\D/g, '')
    if (cpfCnpj.length < 11) {
      return NextResponse.json(
        { error: 'CPF/CNPJ do titular da conta bancária está inválido ou incompleto' },
        { status: 422 }
      )
    }

    recebedor = {
      cpfCnpj,
      tipoChave: 'AGENCIACONTA',
      nomeFavorecido: bank.holderName,
      ispb,
      agencia: bank.branchNumber,
      conta: bank.accountNumber,
      digitoConta: bank.accountCheckDigit,
      tipoConta: mapAccountType(bank.accountType),
    }

    recebedorResumo = {
      nome: bank.holderName,
      metodo: 'Agência + Conta',
      detalhe: `Ag. ${bank.branchNumber} · Conta ${bank.accountNumber}-${bank.accountCheckDigit} (${bank.bankName ?? bank.bankCode})`,
    }
  } else if (pixKey) {
    // Prioridade 2: chave PIX (quando não há dados bancários cadastrados)
    const tipoChave = mapPixKeyType(pixKey.pixKeyType)

    const sanitizePixKeyLocal = (key: string, type: typeof pixKey.pixKeyType): string => {
      if (type === 'PHONE') {
        const digits = key.replace(/\D/g, '')
        if (digits.length <= 11) return `+55${digits}`
        if (!digits.startsWith('55')) return `+55${digits}`
        return `+${digits}`
      }
      if (type === 'CPF' || type === 'CNPJ') {
        return key.replace(/\D/g, '')
      }
      return key
    }

    const chavePix = sanitizePixKeyLocal(pixKey.pixKey, pixKey.pixKeyType)

    const cpfCnpj = (
      pixKey.pixKeyType === 'CPF' || pixKey.pixKeyType === 'CNPJ'
        ? pixKey.pixKey
        : user.cpf ?? ''
    ).replace(/\D/g, '')

    if (cpfCnpj.length < 11) {
      return NextResponse.json(
        {
          error: 'CPF/CNPJ do recebedor não disponível',
          detalhe:
            'A chave PIX cadastrada não é do tipo CPF/CNPJ e o usuário não possui CPF cadastrado. Peça ao usuário que complete seu cadastro.',
        },
        { status: 422 }
      )
    }

    recebedor = {
      tipoChave,
      chavePix,
      cpfCnpj,
      nomeFavorecido: pixKey.accountHolderName || user.name,
    }

    recebedorResumo = {
      nome: recebedor.nomeFavorecido,
      metodo: `Chave PIX (${pixKey.pixKeyType})`,
      detalhe: chavePix,
    }
  } else {
    return NextResponse.json(
      {
        error: 'Usuário não possui conta bancária nem chave PIX cadastrada',
        detalhe: 'Peça ao usuário que cadastre os dados bancários ou chave PIX no perfil.',
      },
      { status: 422 }
    )
  }

  const result = await solicitarTransferenciaPix({
    idtransacao,
    pagador,
    recebedor,
    valor,
    userId: session.user.id as string | undefined,
  })

  if (!result.success) {
    const status = result.error?.httpStatus ?? 500
    return NextResponse.json(
      {
        error: result.error?.message ?? 'Erro ao processar transferência',
        codigo: result.error?.code,
      },
      { status: status >= 400 && status < 600 ? status : 500 }
    )
  }

  // Marcar o saque como concluído após transferência PIX bem-sucedida
  const e2eid = result.data?.e2eid
  const transferIdValue = String(e2eid ?? idtransacao).slice(0, 255)
  await prisma.transaction.update({
    where: { id: BigInt(withdrawalId) },
    data: {
      status: 'COMPLETED',
      paidAt: new Date(),
      transferId: transferIdValue,
      description: buildWithdrawalDescriptionAfterPixSent(withdrawal.description, e2eid),
    },
  })

  await logWithdrawalPixSent({
    performedByUserId: session.user.id,
    withdrawalId: BigInt(withdrawalId),
    beneficiaryUserId: user.id,
    amountBRL: valor,
    payee: recebedorResumo,
    e2eid: e2eid ?? undefined,
    metodoEnvio: 'individual',
  })

  return NextResponse.json(
    {
      success: true,
      data: result.data,
      recebedor: recebedorResumo,
    },
    { status: 200 }
  )
}
