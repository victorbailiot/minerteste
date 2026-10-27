import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'
import { AdminPackageError, upgradeUserPackageGroup } from '@/lib/admin-package-tools'

// POST - Upgrade manual do grupo de pacotes (não gera bônus: pacote atualizado, não comprado)
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
    if (!await hasPermissionOrSuperAdmin(currentUserId, 'packages.activate')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para realizar upgrade de pacotes' }, { status: 403 })
    }

    const { id, packageId } = await params
    const result = await upgradeUserPackageGroup(BigInt(id), BigInt(packageId), currentUserId)

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: `Upgrade realizado: ${result.message}`
      }
    })
  } catch (error) {
    if (error instanceof AdminPackageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }

    console.error('Erro ao realizar upgrade de pacote:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
