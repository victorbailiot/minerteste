import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { getAdminAuditHistory } from '@/lib/admin-audit'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'logs.read')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const performedBy = searchParams.get('performedBy')
    const targetUserId = searchParams.get('targetUserId')
    const performedByTerm = searchParams.get('performedByTerm')
    const targetTerm = searchParams.get('targetTerm')
    const resourceType = searchParams.get('resourceType') || undefined
    const actionType = searchParams.get('actionType') || undefined
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    // Resolver termos para listas de IDs quando necessário
    let performedByIn: bigint[] | undefined
    let targetUserIdIn: bigint[] | undefined

    if (performedByTerm) {
      // Remover pontuação do CPF para busca (manter apenas números)
      const performedByOnlyNumbers = performedByTerm.replace(/[^\d]/g, '')
      
      const orConditions: any[] = [
        { name: { contains: performedByTerm, mode: 'insensitive' } },
        { email: { contains: performedByTerm, mode: 'insensitive' } },
        { phone: { contains: performedByTerm, mode: 'insensitive' } },
        { referralCode: { contains: performedByTerm, mode: 'insensitive' } },
        // quando o termo for um número
        ...(Number.isFinite(Number(performedByTerm))
          ? [{ id: BigInt(performedByTerm) } as any]
          : []),
      ]
      
      // Se o termo de busca contém números, adicionar busca por CPF
      if (performedByOnlyNumbers) {
        orConditions.push({ cpf: { contains: performedByOnlyNumbers, mode: 'insensitive' } })
      }
      
      const ids = await prisma.user.findMany({
        where: {
          OR: orConditions,
        },
        select: { id: true },
        take: 50,
      })
      performedByIn = ids.map(u => BigInt(u.id))
    }

    if (targetTerm) {
      // Remover pontuação do CPF para busca (manter apenas números)
      const targetOnlyNumbers = targetTerm.replace(/[^\d]/g, '')
      
      const orConditions: any[] = [
        { name: { contains: targetTerm, mode: 'insensitive' } },
        { email: { contains: targetTerm, mode: 'insensitive' } },
        { phone: { contains: targetTerm, mode: 'insensitive' } },
        { referralCode: { contains: targetTerm, mode: 'insensitive' } },
        ...(Number.isFinite(Number(targetTerm))
          ? [{ id: BigInt(targetTerm) } as any]
          : []),
      ]
      
      // Se o termo de busca contém números, adicionar busca por CPF
      if (targetOnlyNumbers) {
        orConditions.push({ cpf: { contains: targetOnlyNumbers, mode: 'insensitive' } })
      }
      
      const ids = await prisma.user.findMany({
        where: {
          OR: orConditions,
        },
        select: { id: true },
        take: 50,
      })
      targetUserIdIn = ids.map(u => BigInt(u.id))
    }

    const result = await getAdminAuditHistory({
      page,
      limit,
      performedBy: performedBy ? BigInt(performedBy) : undefined,
      performedByIn,
      targetUserId: targetUserId ? BigInt(targetUserId) : undefined,
      targetUserIdIn,
      resourceType,
      actionType,
      from,
      to,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Erro ao listar auditoria admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}


