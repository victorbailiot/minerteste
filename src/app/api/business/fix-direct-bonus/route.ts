import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { isUserActive } from '@/lib/business-utils'
import { ParameterKeys } from '@/types/parameter-keys'
import { logAdminAction } from '@/lib/admin-audit'
import { computePendingDirectBonusForCurrentSponsor } from '@/lib/direct-bonus-sponsor-utils'

// Esperado = min(compras no período, teto ativos − já pago a outros patrocinadores).
// Período via SPONSOR_CHANGED (ou createdAt). Compras de períodos anteriores não entram.

type FixSource = 'DASHBOARD' | 'ADMIN'

interface DownlineResult {
  downlineId: number
  downlineName: string
  totalExpected: number
  totalPaid: number
  corrected: number
  transactionId?: number
  auditId?: number
}

interface FixResult {
  totalDownlinesAnalyzed: number
  totalCorrected: number
  totalAmountCorrected: number
  details: DownlineResult[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    let body: { targetUserId?: string | number } = {}
    try { body = await request.json() } catch { /* body vazio é válido */ }

    const callerRole: string = (session.user as { role?: string }).role ?? 'USER'
    const isAdmin = callerRole === 'ADMIN' || callerRole === 'SUPPORT' || callerRole === 'SUPER_ADMIN'
    const performedBy = BigInt(session.user.id)

    let sponsorId: bigint
    let source: FixSource

    if (body.targetUserId) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Sem permissão para corrigir bônus de outro usuário' },
          { status: 403 }
        )
      }
      sponsorId = BigInt(body.targetUserId)
      source = 'ADMIN'
    } else {
      sponsorId = BigInt(session.user.id)
      source = 'DASHBOARD'
    }

    const executionId = `fix-${source.toLowerCase()}-${Number(performedBy)}-${Number(sponsorId)}-${Date.now()}`

    const bonusParam = await prisma.parameter.findUnique({
      where: { key: ParameterKeys.UNILEVEL_DIRECT_BONUS_ENABLED }
    })
    const isEnabled = bonusParam ? bonusParam.value === 'true' : true
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Bônus direto unilevel está desabilitado' },
        { status: 400 }
      )
    }

    const isSponsorActive = await isUserActive(sponsorId)
    if (!isSponsorActive) {
      return NextResponse.json(
        { error: 'Usuário não está ativo no sistema' },
        { status: 400 }
      )
    }

    const sponsorUser = await prisma.user.findUnique({
      where: { id: sponsorId },
      select: { id: true, name: true }
    })
    const sponsorName = sponsorUser?.name ?? `Usuário ${Number(sponsorId)}`

    const performerUser = source === 'ADMIN' && performedBy !== sponsorId
      ? await prisma.user.findUnique({
          where: { id: performedBy },
          select: { name: true }
        })
      : null

    console.log(
      `\n🔧 INICIANDO CORREÇÃO DE BÔNUS DIRETO — sponsorId: ${Number(sponsorId)}, ` +
      `executor: ${Number(performedBy)}, origem: ${source}, executionId: ${executionId}`
    )

    const directDownlines = await prisma.unilevelUser.findMany({
      where: { sponsorId },
      select: { userId: true }
    })

    if (directDownlines.length === 0) {
      console.log('   ℹ️  Nenhum downline direto encontrado')
      return NextResponse.json({
        success: true,
        data: {
          totalDownlinesAnalyzed: 0,
          totalCorrected: 0,
          totalAmountCorrected: 0,
          executionId,
          source,
          performedBy: Number(performedBy),
          sponsorId: Number(sponsorId),
          details: []
        }
      })
    }

    const downlineIds = directDownlines.map(d => d.userId)

    const downlineUsers = await prisma.user.findMany({
      where: { id: { in: downlineIds } },
      select: { id: true, name: true }
    })

    const downlineNameMap = new Map(downlineUsers.map(u => [u.id.toString(), u.name]))

    const details: DownlineResult[] = []
    let totalCorrected = 0
    let totalAmountCorrected = new Decimal(0)

    for (const downline of directDownlines) {
      const downlineId = downline.userId
      const downlineName = downlineNameMap.get(downlineId.toString()) ?? `Usuário ${Number(downlineId)}`

      console.log(`\n   👤 Processando downline: ${downlineName} (${Number(downlineId)})`)

      const bonusCalc = await computePendingDirectBonusForCurrentSponsor(sponsorId, downlineId)
      const totalExpected = bonusCalc.expectedForCurrentSponsor
      const totalPaid = bonusCalc.paidToCurrentSponsor
      const diff = bonusCalc.pending

      if (bonusCalc.sponsorPeriodStart) {
        console.log(`      Período patrocínio desde: ${bonusCalc.sponsorPeriodStart.toISOString()}`)
      }
      console.log(`      Teto (pacotes ativos):      R$ ${bonusCalc.activeCeiling}`)
      if (bonusCalc.paidToOthers.gt(0)) {
        console.log(`      Pago a outros patroc.:      R$ ${bonusCalc.paidToOthers}`)
        console.log(`      Teto restante:              R$ ${bonusCalc.remainingCeiling}`)
      }
      console.log(`      Compras no período:         R$ ${bonusCalc.purchasesInPeriod}`)
      console.log(`      Bônus Esperado (período):   R$ ${totalExpected}`)
      console.log(`      Bônus Pago (atual):         R$ ${totalPaid}`)
      console.log(`      Diferença:                  R$ ${diff}`)
      if (totalPaid.gt(totalExpected) && diff.gt(0)) {
        console.log(`      ℹ️  Correção por compras não pagas após redução de tarifas`)
      } else if (totalPaid.gt(totalExpected)) {
        console.log(`      ⚠️  Patrocinador já recebeu acima do esperado no período`)
      }

      const detail: DownlineResult = {
        downlineId: Number(downlineId),
        downlineName,
        totalExpected: totalExpected.toNumber(),
        totalPaid: totalPaid.toNumber(),
        corrected: 0
      }

      if (diff.gt(0)) {
        let createdTransactionId: bigint | null = null
        let correctedAmount = new Decimal(0)

        await prisma.$transaction(async (tx) => {
          const freshCalc = await computePendingDirectBonusForCurrentSponsor(sponsorId, downlineId)
          const freshDiff = freshCalc.pending

          if (freshDiff.lte(0)) {
            console.log(`      ⏭️  Correção desnecessária (outro processo já corrigiu)`)
            return
          }

          const correlationID = `${executionId}-downline-${Number(downlineId)}`

          const createdTx = await tx.transaction.create({
            data: {
              userId: sponsorId,
              type: 'DIRECT_BONUS',
              amount: freshDiff,
              description: `Bônus de indicação direta — ${downlineName}`,
              level: 1,
              sourceUserId: downlineId,
              status: 'COMPLETED',
              correlationID,
              quantity: 1
            }
          })

          createdTransactionId = createdTx.id
          correctedAmount = freshDiff
          console.log(
            `      ✅ Correção criada: R$ ${freshDiff} (transactionId: ${Number(createdTx.id)}, correlationID: ${correlationID})`
          )
        })

        if (createdTransactionId && correctedAmount.gt(0)) {
          const amountFormatted = correctedAmount.toFixed(2)
          const description =
            source === 'ADMIN'
              ? `Correção bônus direto (admin): R$ ${amountFormatted} para ${sponsorName} — indicado ${downlineName} — transação #${Number(createdTransactionId)}`
              : `Correção bônus direto (dashboard): R$ ${amountFormatted} — indicado ${downlineName} — transação #${Number(createdTransactionId)}`

          const auditId = await logAdminAction({
            actionType: 'DIRECT_BONUS_FIX',
            performedBy,
            targetUserId: sponsorId,
            resourceType: 'Transaction',
            resourceId: createdTransactionId,
            oldValue: {
              totalPaid: totalPaid.toNumber(),
              totalExpected: totalExpected.toNumber()
            },
            newValue: {
              amount: correctedAmount.toNumber(),
              downlineId: Number(downlineId),
              downlineName,
              transactionId: Number(createdTransactionId)
            },
            description,
            metadata: {
              source,
              executionId,
              sponsorId: Number(sponsorId),
              sponsorName,
              downlineId: Number(downlineId),
              downlineName,
              transactionId: Number(createdTransactionId),
              amount: correctedAmount.toNumber(),
              totalExpected: totalExpected.toNumber(),
              totalPaid: totalPaid.toNumber(),
              ...(source === 'ADMIN' && performerUser
                ? { adminName: performerUser.name, adminId: Number(performedBy) }
                : {})
            }
          })

          detail.corrected = correctedAmount.toNumber()
          detail.transactionId = Number(createdTransactionId)
          if (auditId) detail.auditId = Number(auditId)
          totalCorrected++
          totalAmountCorrected = totalAmountCorrected.add(correctedAmount)

          console.log(
            `      📋 Auditoria registrada: auditId=${auditId ? Number(auditId) : 'N/A'}, origem=${source}`
          )
        }
      } else {
        console.log(`      ✅ Bônus em dia (nenhuma correção necessária)`)
      }

      details.push(detail)
    }

    console.log(`\n🎉 CORREÇÃO CONCLUÍDA:`)
    console.log(`   Downlines analisados: ${directDownlines.length}`)
    console.log(`   Bônus corrigidos: ${totalCorrected}`)
    console.log(`   Valor total corrigido: R$ ${totalAmountCorrected}`)

    return NextResponse.json({
      success: true,
      data: {
        totalDownlinesAnalyzed: directDownlines.length,
        totalCorrected,
        totalAmountCorrected: totalAmountCorrected.toNumber(),
        executionId,
        source,
        performedBy: Number(performedBy),
        sponsorId: Number(sponsorId),
        details
      } satisfies FixResult & {
        executionId: string
        source: FixSource
        performedBy: number
        sponsorId: number
      }
    })
  } catch (error) {
    console.error('❌ Erro ao corrigir bônus diretos:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar correção de bônus' },
      { status: 500 }
    )
  }
}
