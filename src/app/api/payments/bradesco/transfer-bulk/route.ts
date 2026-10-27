/**
 * POST /api/payments/bradesco/transfer-bulk
 *
 * Lista saques aprovados pelo admin (PENDING no banco + marcador na descrição), monta o array de recebedores
 * e envia para o Bradesco via Pagamento em Lote (quando disponível)
 * ou via transferências individuais como fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enviarPagamentoLote } from '@/lib/bradesco/batch-service'
import { solicitarTransferenciaPix } from '@/lib/bradesco-pix-service'
import { getBradescoConfig } from '@/lib/bradesco/config'
import type { PixPayer, PixReceiver } from '@/lib/bradesco/types'
import type { PagamentoLoteRequest, PagamentoLoteItemPix, PagamentoLoteItemConta } from '@/lib/bradesco/batch-types'
import {
  BANK_CODE_TO_ISPB,
  buildPayeeSummaryForAudit,
  getActiveBankAndPix,
  getBradescoPagadorProductionIssue,
  mapAccountType,
  mapPixKeyTypeToLote,
  sanitizePixKey,
} from '@/lib/bradesco/transfer-utils'
import { logWithdrawalPixSent } from '@/lib/admin-audit'
import {
  buildBradescoPixIdTransacaoForWithdrawal,
  bradescoIdTransacaoWithdrawalPrefix,
} from '@/lib/bradesco/id-transacao'

const mapPixKeyType = (type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'): 'CPFCNPJ' | 'EMAIL' | 'TELEFONE' | 'EVP' => {
  switch (type) {
    case 'CPF': case 'CNPJ': return 'CPFCNPJ'
    case 'EMAIL': return 'EMAIL'
    case 'PHONE': return 'TELEFONE'
    case 'RANDOM': return 'EVP'
  }
}

export const POST = async (_req: NextRequest): Promise<NextResponse> => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const bradescoConfig = getBradescoConfig()
  const isSandbox = bradescoConfig.environment === 'sandbox'

  // Sandbox: dados fixos para testes (pagador + recebedor + valor + idtransacao)
  const sandboxPagador: PixPayer = {
    tipoChave: 'TELEFONE',
    chavePix: '+5511912345678',
  }
  const sandboxRecebedor: PixReceiver = {
    cpfCnpj: '36955154818',
    tipoChave: 'AGENCIACONTA',
    nomeFavorecido: 'Marcos Albuquerque',
    ispb: '31872495',
    agencia: '1',
    conta: '15659061',
    digitoConta: '1',
    tipoConta: 'CONTA_CORRENTE',
  }
  const sandboxValor = '100.89'
  const sandboxIdTransacaoBase = '3835678'

  let pagador: PixPayer
  if (isSandbox) {
    pagador = sandboxPagador
  } else if (bradescoConfig.pagadorTipoChave === 'AGENCIACONTA') {
    if (!bradescoConfig.pagadorAgencia || !bradescoConfig.pagadorConta) {
      return NextResponse.json({ error: 'Pagador não configurado no .env' }, { status: 500 })
    }
    pagador = { tipoChave: 'AGENCIACONTA', agencia: bradescoConfig.pagadorAgencia, conta: bradescoConfig.pagadorConta }
  } else {
    if (!bradescoConfig.pagadorChavePix) {
      return NextResponse.json({ error: 'Pagador não configurado no .env' }, { status: 500 })
    }
    pagador = { tipoChave: bradescoConfig.pagadorTipoChave, chavePix: bradescoConfig.pagadorChavePix }
  }

  if (!isSandbox) {
    const pagadorIssue = getBradescoPagadorProductionIssue(bradescoConfig.environment, pagador)
    if (pagadorIssue) {
      return NextResponse.json({ error: pagadorIssue }, { status: 400 })
    }
  }

  const withdrawals = await prisma.transaction.findMany({
    where: {
      type: 'WITHDRAWAL',
      status: 'PENDING',
      description: { contains: ' - Aprovado em:' },
    },
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
    orderBy: { createdAt: 'asc' },
    take: 500,
  })

  const payables = withdrawals.filter((w) => {
    const u = w.user
    if (!u) return false
    const { bankAccount, pixKey } = getActiveBankAndPix(u.bankAccount, u.pixKey)
    return !!(pixKey || bankAccount)
  })

  if (payables.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Nenhuma solicitação aprovada elegível para PIX',
      data: { successCount: 0, failCount: 0, method: 'none' },
    })
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const idLote = `LOTE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const listaPagamentos: (PagamentoLoteItemPix | PagamentoLoteItemConta)[] = []

  payables.forEach((w, index) => {
    const u = w.user!
    const { bankAccount, pixKey } = getActiveBankAndPix(u.bankAccount, u.pixKey)
    const valorLiquido = w.taxa ? Number(w.amount) * (1 - Number(w.taxa) / 100) : Number(w.amount)
    const valor = isSandbox ? sandboxValor : valorLiquido.toFixed(2)
    const idTransacao = isSandbox
      ? sandboxIdTransacaoBase
      : buildBradescoPixIdTransacaoForWithdrawal(w.id)

    if (isSandbox) {
      // Em sandbox: pagador, recebedor, valor e idtransacao fixos
      listaPagamentos.push({
        idTransacao,
        valor,
        favorecido: {
          nome: sandboxRecebedor.nomeFavorecido,
          cpfCnpj: sandboxRecebedor.cpfCnpj,
        },
        conta: {
          ispb: sandboxRecebedor.ispb,
          agencia: sandboxRecebedor.agencia,
          conta: sandboxRecebedor.conta,
          digitoConta: sandboxRecebedor.digitoConta,
          tipoConta: 'CONTA_CORRENTE',
        },
      })
      return
    }

    if (pixKey) {
      const chave = sanitizePixKey(pixKey.pixKey, pixKey.pixKeyType)
      const cpfCnpj = (
        pixKey.pixKeyType === 'CPF' || pixKey.pixKeyType === 'CNPJ'
          ? pixKey.pixKey
          : u.cpf ?? ''
      ).replace(/\D/g, '')
      if (cpfCnpj.length >= 11) {
        listaPagamentos.push({
          idTransacao,
          valor,
          favorecido: {
            nome: pixKey.accountHolderName || u.name,
            cpfCnpj,
          },
          pix: {
            chave,
            tipo: mapPixKeyTypeToLote(pixKey.pixKeyType),
          },
        })
      }
    } else if (bankAccount) {
      const bank = bankAccount
      const ispb = BANK_CODE_TO_ISPB[bank.bankCode] ?? ''
      const cpfCnpj = bank.holderDocument.replace(/\D/g, '')
      if (ispb && cpfCnpj.length >= 11) {
        listaPagamentos.push({
          idTransacao,
          valor,
          favorecido: {
            nome: bank.holderName,
            cpfCnpj,
          },
          conta: {
            ispb,
            agencia: bank.branchNumber,
            conta: bank.accountNumber,
            digitoConta: bank.accountCheckDigit,
            tipoConta: mapAccountType(bank.accountType),
          },
        })
      }
    }
  })

  if (listaPagamentos.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Nenhum item válido para envio',
      data: { successCount: 0, failCount: 0, method: 'none' },
    })
  }

  const batchRequest: PagamentoLoteRequest = {
    idLote,
    tipoPagamento: '05',
    dataPagamento: hoje,
    listaPagamentos,
  }

  const batchResult = await enviarPagamentoLote(batchRequest)

  if (batchResult.success && batchResult.data) {
    const data = batchResult.data
    const listaResultados = data.listaResultados ?? []
    const idTransacaoToWithdrawal = new Map<string, bigint>()
    for (const w of payables) {
      const prefix = bradescoIdTransacaoWithdrawalPrefix(w.id)
      const item = listaPagamentos.find((p) => p.idTransacao.startsWith(prefix))
      if (item) idTransacaoToWithdrawal.set(item.idTransacao, w.id)
    }

    let successCount = 0
    for (const r of listaResultados) {
      const status = (r.status ?? '').toUpperCase()
      if (status === 'CONCLUIDO' || status === 'PROCESSADO' || status === 'LIQUIDADO') {
        const txId = idTransacaoToWithdrawal.get(r.idTransacao)
        if (txId) {
          await prisma.transaction.update({
            where: { id: txId },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(),
              transferId: r.e2eid ?? r.idTransacao,
            },
          })
          successCount++
          const w = payables.find((p) => p.id === txId)
          const u = w?.user
          const payee = u ? buildPayeeSummaryForAudit(u) : null
          if (u && payee) {
            const valorLiquido = w!.taxa ? Number(w!.amount) * (1 - Number(w!.taxa) / 100) : Number(w!.amount)
            const amountStr = isSandbox ? sandboxValor : valorLiquido.toFixed(2)
            await logWithdrawalPixSent({
              performedByUserId: session.user.id,
              withdrawalId: txId,
              beneficiaryUserId: u.id,
              amountBRL: amountStr,
              payee,
              e2eid: r.e2eid ?? undefined,
              idLote,
              metodoEnvio: 'batch',
            })
          }
        }
      }
    }

    if (listaResultados.length === 0 && (data.status === 'PROCESSADO' || data.codMensagem === '0')) {
      for (const w of payables) {
        await prisma.transaction.update({
          where: { id: w.id },
          data: { status: 'COMPLETED', paidAt: new Date(), transferId: idLote },
        })
        successCount++
        const u = w.user
        const payee = u ? buildPayeeSummaryForAudit(u) : null
        if (u && payee) {
          const valorLiquido = w.taxa ? Number(w.amount) * (1 - Number(w.taxa) / 100) : Number(w.amount)
          const amountStr = isSandbox ? sandboxValor : valorLiquido.toFixed(2)
          await logWithdrawalPixSent({
            performedByUserId: session.user.id,
            withdrawalId: w.id,
            beneficiaryUserId: u.id,
            amountBRL: amountStr,
            payee,
            e2eid: undefined,
            idLote,
            metodoEnvio: 'batch',
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${successCount} saque(s) processado(s) via lote`,
      data: {
        successCount,
        failCount: listaPagamentos.length - successCount,
        method: 'batch',
        idLote,
      },
    })
  }

  const batchError = batchResult.error?.message ?? ''
  const is404 = batchResult.error?.httpStatus === 404
  const isBatchUnavailable = is404 || batchError.includes('não configurado') || batchError.includes('404')

  if (isBatchUnavailable) {
    let successCount = 0
    let failCount = 0

    for (let index = 0; index < payables.length; index++) {
      const w = payables[index]
      const u = w.user!
      const { bankAccount, pixKey } = getActiveBankAndPix(u.bankAccount, u.pixKey)
      const valorLiquido = w.taxa ? Number(w.amount) * (1 - Number(w.taxa) / 100) : Number(w.amount)
      const valorEnvio = isSandbox ? sandboxValor : valorLiquido.toFixed(2)
      const idTransacaoEnvio = isSandbox
        ? sandboxIdTransacaoBase
        : buildBradescoPixIdTransacaoForWithdrawal(w.id)
      let recebedor: PixReceiver

      if (isSandbox) {
        recebedor = sandboxRecebedor
      } else if (pixKey) {
        const tipoChave = mapPixKeyType(pixKey.pixKeyType)
        const chavePix = sanitizePixKey(pixKey.pixKey, pixKey.pixKeyType)
        const cpfCnpj = (
          pixKey.pixKeyType === 'CPF' || pixKey.pixKeyType === 'CNPJ'
            ? pixKey.pixKey
            : u.cpf ?? ''
        ).replace(/\D/g, '')
        if (cpfCnpj.length < 11) {
          failCount++
          continue
        }
        recebedor = {
          tipoChave,
          chavePix,
          cpfCnpj,
          nomeFavorecido: pixKey.accountHolderName || u.name,
        }
      } else if (bankAccount) {
        const bank = bankAccount
        const ispb = BANK_CODE_TO_ISPB[bank.bankCode] ?? ''
        if (!ispb) {
          failCount++
          continue
        }
        const cpfCnpj = bank.holderDocument.replace(/\D/g, '')
        if (cpfCnpj.length < 11) {
          failCount++
          continue
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
      } else {
        failCount++
        continue
      }

      const result = await solicitarTransferenciaPix({
        idtransacao: idTransacaoEnvio,
        pagador,
        recebedor,
        valor: valorEnvio,
        userId: session.user.id as string | undefined,
      })

      if (result.success) {
        await prisma.transaction.update({
          where: { id: w.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            transferId: result.data?.e2eid ?? undefined,
          },
        })
        successCount++
        const payee = buildPayeeSummaryForAudit(u)
        if (payee) {
          await logWithdrawalPixSent({
            performedByUserId: session.user.id,
            withdrawalId: w.id,
            beneficiaryUserId: u.id,
            amountBRL: valorEnvio,
            payee,
            e2eid: result.data?.e2eid ?? undefined,
            metodoEnvio: 'individual',
          })
        }
      } else {
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Endpoint de lote indisponível. Processado via transferências individuais: ${successCount} sucesso, ${failCount} falha.`,
      data: {
        successCount,
        failCount,
        method: 'individual',
      },
    })
  }

  return NextResponse.json(
    {
      error: batchResult.error?.message ?? 'Erro ao processar lote',
      data: { successCount: 0, failCount: listaPagamentos.length, method: 'batch' },
    },
    { status: batchResult.error?.httpStatus && batchResult.error.httpStatus >= 400 ? batchResult.error.httpStatus : 500 }
  )
}
