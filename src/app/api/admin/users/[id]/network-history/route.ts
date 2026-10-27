import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNetworkPackageHistory } from '@/lib/business-logic-unilevel'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = BigInt(id)

    // Obter parâmetros de paginação da query string
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const includeSelf = searchParams.get('includeSelf') !== 'false' // Default true

    // Validar parâmetros
    if (page < 1 || limit < 1 || limit > 200) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros de paginação inválidos. Page >= 1, Limit entre 1 e 200'
      }, { status: 400 })
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Buscar histórico da rede usando a função de lógica de negócio otimizada
    const networkData = await getNetworkPackageHistory(userId, includeSelf, page, limit)

    return NextResponse.json({
      success: true,
      data: networkData
    })

  } catch (error) {
    console.error('Erro ao buscar histórico da rede:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
