import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserFinancialData } from '@/lib/business-logic'
import { serializeBigInt } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API /api/auth/me chamada')
    
    const session = await getServerSession(authOptions)
    console.log('📄 Sessão recebida:', session ? 'SIM' : 'NÃO')
    
    if (!session || !session.user || !session.user.id) {
      console.log('❌ Usuário não autenticado')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    console.log('✅ Sessão válida, userId:', session.user.id)
    const userId = BigInt(session.user.id)
    console.log('🔍 Buscando usuário no banco:', Number(userId))

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        // balance e totalEarned removidos - agora calculados dinamicamente
        createdAt: true,
        sponsorId: true,
        parentId: true,
        position: true,
        preferredSide: true,
        packages: {
          include: {
            package: true
          }
        }
      }
    })

    if (!user) {
      console.log('❌ Usuário não encontrado no banco para ID:', Number(userId))
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    console.log('✅ Usuário encontrado:', user.name)

    // Calcular dados financeiros dinamicamente
    const financialData = await getUserFinancialData(userId)
    console.log('💰 Dados financeiros calculados - Balance:', Number(financialData.balance), 'TotalEarned:', Number(financialData.totalEarned))
    
    // Preparar dados do usuário com dados financeiros
    const userWithFinancialData = {
      ...user,
      balance: financialData.balance,
      totalEarned: financialData.totalEarned
    }
    
    return NextResponse.json({ user: serializeBigInt(userWithFinancialData) })

  } catch (error) {
    console.error('❌ Erro na verificação do usuário:', error)
    return NextResponse.json({ error: 'Erro de autenticação' }, { status: 401 })
  }
} 