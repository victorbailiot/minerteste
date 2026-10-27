import { NextRequest, NextResponse } from 'next/server'
import { getNetworkTree, getNetworkStats } from '@/lib/spillover'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🌳 API /api/network/tree chamada')

    // Obter a sessão do Next Auth
    const session = await getServerSession(authOptions)
    console.log('📄 Sessão recebida:', session ? 'SIM' : 'NÃO')

    if (!session || !session.user || !session.user.id) {
      console.log('❌ Usuário não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log('✅ Sessão válida, userId:', session.user.id)
    const userIdBigInt = BigInt(session.user.id)

    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url)
    const maxDepth = parseInt(searchParams.get('depth') || '5')
    const includeStats = searchParams.get('stats') === 'true'
    const rootUserIdParam = searchParams.get('rootUserId')

    // Determinar qual usuário usar como raiz
    const rootUserId = rootUserIdParam ? BigInt(rootUserIdParam) : userIdBigInt

    console.log('🌳 Buscando árvore da rede para userId:', Number(rootUserId), 'depth:', maxDepth)

    // Buscar árvore da rede a partir do usuário especificado
    const networkTree = await getNetworkTree(rootUserId, maxDepth)

    if (!networkTree) {
      console.log('❌ Usuário não encontrado para árvore:', Number(rootUserId))
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ Árvore encontrada com sucesso')

    // Buscar estatísticas sempre do usuário autenticado (não da nova raiz)
    let stats: any = null
    if (includeStats) {
      console.log('📊 Buscando estatísticas para userId:', Number(userIdBigInt))
      stats = await getNetworkStats(userIdBigInt)
      console.log('✅ Estatísticas obtidas:', stats)
    }

    return NextResponse.json({
      success: true,
      tree: networkTree,
      stats,
      metadata: {
        maxDepth,
        rootUserId: rootUserId.toString(),
        originalUserId: userIdBigInt.toString(),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar árvore da rede:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 