import { NextRequest, NextResponse } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'
import { logAdminAction } from '@/lib/admin-audit'
import { generateMissingPurchaseBonuses } from '@/lib/business-logic-unilevel'
import { getPurchaseCorrelationIds, isAdminGeneratedDescription } from '@/lib/admin-package-tools'

const generateBonusesSchema = z.object({
  // Pacotes "Gerado pelo Admin" só geram bônus quando o admin permitir explicitamente
  allowAdminGenerated: z.boolean().optional().default(false)
})

// POST - Gerar bônus de indicação direto e/ou indireto que não foram pagos na compra do pacote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(currentUserId, 'bonus.create')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para gerar bônus' }, { status: 403 })
    }

    const { id, packageId } = await params
    const userId = BigInt(id)
    const userPackageId = BigInt(packageId)
    const rawBody = await request.text()
    const { allowAdminGenerated } = generateBonusesSchema.parse(rawBody ? JSON.parse(rawBody) : {})

    const userPackage = await prisma.userPackage.findFirst({
      where: { id: userPackageId, userId },
      include: {
        package: { select: { id: true, name: true } },
        transaction: {
          select: {
            id: true,
            amount: true,
            status: true,
            description: true,
            correlationID: true,
            userPackages: { select: { directBonusSnapshot: true } }
          }
        }
      }
    })

    if (!userPackage) {
      return NextResponse.json({ success: false, error: 'Pacote não encontrado ou não pertence ao usuário' }, { status: 404 })
    }

    const transaction = userPackage.transaction
    if (!transaction?.correlationID) {
      return NextResponse.json({
        success: false,
        error: 'Pacote sem transação ou sem correlationID: não é possível identificar a compra'
      }, { status: 400 })
    }

    if (transaction.status !== 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'A compra deste pacote não está concluída' }, { status: 400 })
    }

    const isAdminGenerated = isAdminGeneratedDescription(transaction.description)
    if (isAdminGenerated && !allowAdminGenerated) {
      return NextResponse.json({
        success: false,
        error: 'Pacote gerado pelo admin: marque a opção para permitir a geração de bônus'
      }, { status: 400 })
    }

    const correlationIds = getPurchaseCorrelationIds(transaction.correlationID)
    const existing = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        correlationID: { in: correlationIds },
        type: { in: ['DIRECT_BONUS', 'INDIRECT_BONUS'] },
        status: { not: 'CANCELLED' }
      },
      _count: { _all: true }
    })
    const hasDirect = existing.some((row) => row.type === 'DIRECT_BONUS' && row._count._all > 0)
    const hasIndirect = existing.some((row) => row.type === 'INDIRECT_BONUS' && row._count._all > 0)

    if (hasDirect && hasIndirect) {
      return NextResponse.json({
        success: true,
        message: 'Os bônus direto e indireto desta compra já foram gerados',
        data: {
          direct: { attempted: false, generated: false, amount: 0 },
          indirect: { attempted: false, generated: false, count: 0, amount: 0 }
        }
      })
    }

    const directBonusBase = transaction.userPackages.reduce(
      (sum, pkg) => sum.add(pkg.directBonusSnapshot),
      new Decimal(0)
    )

    const result = await generateMissingPurchaseBonuses({
      buyerId: userId,
      packageId: userPackage.package.id,
      correlationID: transaction.correlationID,
      purchaseAmount: new Decimal(transaction.amount),
      directBonusBase,
      generateDirect: !hasDirect,
      generateIndirect: !hasIndirect,
      // Pacotes do admin não entram no teto do patrocinador; quando permitidos, pagam o bônus cheio
      applyDirectCap: !isAdminGenerated
    })

    const parts: string[] = []
    if (result.direct.generated) parts.push(`direto de R$ ${result.direct.amount.toFixed(2)}`)
    if (result.indirect.generated) parts.push(`${result.indirect.count} indireto(s) somando R$ ${result.indirect.amount.toFixed(2)}`)

    const notGenerated = [
      result.direct.attempted && !result.direct.generated ? `direto: ${result.direct.reason}` : null,
      result.indirect.attempted && !result.indirect.generated ? `indireto: ${result.indirect.reason}` : null
    ].filter(Boolean)

    const message = parts.length
      ? `Bônus gerado(s): ${parts.join(' e ')}`
      : `Nenhum bônus novo foi gerado${notGenerated.length ? ` (${notGenerated.join('; ')})` : ''}`

    if (parts.length) {
      await logAdminAction({
        actionType: 'BONUS_GENERATED',
        performedBy: currentUserId,
        targetUserId: userId,
        resourceType: 'USER_PACKAGE',
        resourceId: userPackageId,
        newValue: result,
        description: `Bônus de indicação gerado para o pacote #${userPackageId} (${userPackage.package.name}) do usuário ${userId}: ${parts.join(' e ')}`,
        metadata: {
          correlationID: transaction.correlationID,
          transactionId: Number(transaction.id),
          adminGenerated: isAdminGenerated
        }
      })
    }

    return NextResponse.json({ success: true, message, data: result })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos' }, { status: 400 })
    }

    console.error('Erro ao gerar bônus do pacote:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
