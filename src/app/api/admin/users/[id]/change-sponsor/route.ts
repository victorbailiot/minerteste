import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { logAdminAction } from '@/lib/admin-audit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermission(currentUserId, 'network.manage')) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar rede' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)
    const { newSponsorId } = await req.json()

    if (!newSponsorId) {
      return NextResponse.json(
        { success: false, error: 'ID do novo patrocinador não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, sponsorId: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o novo patrocinador existe
    const newSponsor = await prisma.user.findUnique({
      where: { id: newSponsorId },
      select: { id: true, name: true }
    })

    if (!newSponsor) {
      return NextResponse.json(
        { success: false, error: 'Novo patrocinador não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o novo patrocinador não é o mesmo que o atual
    if (targetUser.sponsorId && Number(targetUser.sponsorId) === newSponsorId) {
      return NextResponse.json(
        { success: false, error: 'O novo patrocinador é o mesmo que o atual' },
        { status: 400 }
      )
    }

    // Verificar se o novo patrocinador não é o próprio usuário
    if (userId === newSponsorId) {
      return NextResponse.json(
        { success: false, error: 'O usuário não pode ser patrocinador dele mesmo' },
        { status: 400 }
      )
    }

    // Verificar se o usuário não está na linha ascendente do novo patrocinador
    // (isso criaria um loop na rede)
    let currentSponsorId: bigint | null = newSponsor.id
    const maxDepth = 100 // Evitar loops infinitos
    let depth = 0

    while (currentSponsorId && depth < maxDepth) {
      if (Number(currentSponsorId) === userId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Não é possível definir este patrocinador pois criaria um loop na rede' 
          },
          { status: 400 }
        )
      }

      const sponsorData = await prisma.user.findUnique({
        where: { id: currentSponsorId },
        select: { sponsorId: true }
      })

      currentSponsorId = sponsorData?.sponsorId || null
      depth++
    }

    // Guardar sponsor antigo
    const oldSponsorId = targetUser.sponsorId ?? null

    // Atualizar o sponsorId nas duas tabelas
    await prisma.$transaction(async (tx) => {
      // Atualizar na tabela users
      await tx.user.update({
        where: { id: BigInt(userId) },
        data: { sponsorId: BigInt(newSponsorId) }
      })
      
      // Atualizar na tabela unilevel_users (se existir)
      const unilevelUser = await tx.unilevelUser.findUnique({
        where: { userId: BigInt(userId) }
      })

      if (unilevelUser) {
        await tx.unilevelUser.update({
          where: { userId: BigInt(userId) },
          data: { sponsorId: BigInt(newSponsorId) }
        })
      }
    })

    // Auditoria administrativa
    try {
      await logAdminAction({
        actionType: 'SPONSOR_CHANGED',
        performedBy: BigInt(user.id),
        targetUserId: BigInt(userId),
        resourceType: 'USER',
        resourceId: BigInt(userId),
        oldValue: { sponsorId: oldSponsorId ? Number(oldSponsorId) : null },
        newValue: { sponsorId: newSponsorId },
        description: `Patrocinador do usuário ${userId} alterado de ${oldSponsorId ? Number(oldSponsorId) : null} para ${newSponsorId} por admin ${user.id}`,
        metadata: {
          oldSponsorId: oldSponsorId ? Number(oldSponsorId) : null,
          newSponsorId,
          newSponsorName: newSponsor.name,
        },
      })
    } catch (auditErr) {
      console.error('Falha ao auditar troca de patrocinador:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Patrocinador alterado com sucesso',
      data: {
        userId,
        newSponsorId,
        newSponsorName: newSponsor.name
      }
    })
  } catch (error) {
    console.error('Erro ao alterar patrocinador:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao alterar patrocinador' },
      { status: 500 }
    )
  }
}

