import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isUserActive } from '@/lib/business-utils'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testando função isUserActive')
    
    // Buscar um usuário qualquer
    const usuario = await prisma.user.findFirst({
      include: {
        packages: true,
        activations: {
          where: { status: 'ACTIVE' }
        }
      }
    })
    
    if (!usuario) {
      return NextResponse.json({ error: 'Nenhum usuário encontrado' }, { status: 404 })
    }
    
    console.log(`👤 Testando usuário: ${usuario.name} (ID: ${usuario.id})`)
    
    // Verificar primeiro pacote
    const firstPackage = await prisma.userPackage.findFirst({
      where: {
        userId: usuario.id,
        isActive: true
      },
      orderBy: {
        activatedAt: 'asc'
      }
    })
    
    let daysSinceFirstPackage: number | null = null
    if (firstPackage) {
      const now = new Date()
      daysSinceFirstPackage = Math.floor((now.getTime() - firstPackage.activatedAt.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`📦 Primeiro pacote: ${firstPackage.activatedAt.toLocaleDateString()} (há ${daysSinceFirstPackage} dias)`)
    }
    
    // Verificar ativação atual
    const temAtivacao = usuario.activations.length > 0
    console.log(`🔄 Ativação mensal: ${temAtivacao ? 'SIM' : 'NÃO'}`)
    
    // Testar função isUserActive
    const isAtivo = await isUserActive(usuario.id)
    console.log(`✅ isUserActive(): ${isAtivo ? 'ATIVO' : 'INATIVO'}`)
    
    // Análise da regra
    let motivoAtivacao = ''
    let expectedAtivo = false
    
    if (temAtivacao) {
      motivoAtivacao = 'Tem ativação mensal válida'
      expectedAtivo = true
    } else if (firstPackage && daysSinceFirstPackage !== null && daysSinceFirstPackage < 32) {
      motivoAtivacao = `Período de graça (${daysSinceFirstPackage} dias < 32)`
      expectedAtivo = true
    } else if (firstPackage && daysSinceFirstPackage !== null) {
      motivoAtivacao = `Fora do período de graça (${daysSinceFirstPackage} dias >= 32)`
      expectedAtivo = false
    } else {
      motivoAtivacao = 'Sem pacotes'
      expectedAtivo = false
    }
    
    const resultadoCorreto = isAtivo === expectedAtivo
    
    const result = {
      usuario: {
        id: Number(usuario.id),
        name: usuario.name
      },
      primeiroPacote: firstPackage ? {
        data: firstPackage.activatedAt.toLocaleDateString(),
        diasAtras: daysSinceFirstPackage
      } : null,
      temAtivacao,
      isAtivo,
      motivoAtivacao,
      expectedAtivo,
      resultadoCorreto,
      teste: resultadoCorreto ? 'PASSOU' : 'FALHOU'
    }
    
    console.log('📊 Resultado do teste:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
} 