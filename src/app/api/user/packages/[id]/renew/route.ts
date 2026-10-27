import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PackageRenewalError, renewUserPackage } from '@/lib/package-renewal'

// POST - Renovar cota expirada (gratuita, uma única vez)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const result = await renewUserPackage(BigInt(session.user.id), BigInt(id))

    return NextResponse.json({
      success: true,
      message: `${result.daysAdded} dias adicionados à validade da cota ${result.packageName}.`,
      data: result
    })
  } catch (error) {
    if (error instanceof PackageRenewalError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }

    console.error('Erro ao renovar cota:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
