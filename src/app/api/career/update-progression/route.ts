import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkCareerProgressionForUpline } from '@/lib/business-logic-unilevel'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    
    console.log(`🔄 Iniciando atualização de progressão de carreira para usuário ${Number(userId)}`)
    
    // Executar verificação de progressão para toda linha ascendente
    await checkCareerProgressionForUpline(userId, 0)
    
    console.log(`✅ Progressão de carreira atualizada com sucesso para usuário ${Number(userId)}`)

    return NextResponse.json({
      success: true,
      message: 'Progressão de carreira atualizada com sucesso!'
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar progressão de carreira:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
