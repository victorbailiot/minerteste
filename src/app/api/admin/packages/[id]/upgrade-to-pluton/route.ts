import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'
import { AdminPackageError, upgradeUserTectonsToPluton } from '@/lib/admin-package-tools'

const upgradeToPlutonSchema = z.object({
  userId: z.union([z.string(), z.number()]).transform((value) => BigInt(value))
})

// POST - Converte cada 5 Tecton do usuário (mesmo grupo) em 1 Pluton
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(currentUserId, 'packages.activate')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para realizar upgrade de pacotes' }, { status: 403 })
    }

    const { id } = await params
    const { userId } = upgradeToPlutonSchema.parse(await request.json())
    const result = await upgradeUserTectonsToPluton(userId, BigInt(id), currentUserId)

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: `Upgrade realizado: ${result.message}`
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Usuário inválido' }, { status: 400 })
    }

    if (error instanceof AdminPackageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }

    console.error('Erro ao realizar upgrade para Pluton:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
