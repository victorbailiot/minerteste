import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPagarMeAPI, createKycLink } from '@/lib/pagarme/pagarme'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não autenticado'
      }, { status: 401 })
    }

    const userId = session.user.id

    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        userId: BigInt(userId),
        excludedAt: null
      }
    })

    if (!bankAccount) {
      return NextResponse.json({
        success: false,
        error: 'Conta bancária não encontrada'
      }, { status: 404 })
    }

    if (!bankAccount.recipientId) {
      return NextResponse.json({
        success: false,
        error: 'ID do recebedor não encontrado'
      }, { status: 400 })
    }

    // Inicializar API PagarMe
    const api = createPagarMeAPI({
      apiKey: process.env.PAGARME_API_KEY!,
      env: process.env.PAGARME_ENV as 'sandbox' | 'production' || 'sandbox'
    })

    if (!api) {
      return NextResponse.json({
        success: false,
        error: 'Configuração PagarMe não encontrada'
      }, { status: 500 })
    }

    // Criar link KYC
    const kycLink = await createKycLink(bankAccount.recipientId)

    return NextResponse.json({
      success: true,
      data: kycLink
    })

  } catch (error) {
    console.error('Erro ao criar link KYC:', error)
    
    // Tratamento específico para erro de IP não autorizado
    if (error instanceof Error && error.message.includes('IP de origem não autorizado')) {
      return NextResponse.json({
        success: false,
        error: 'Configuração de IP não autorizada. Entre em contato com o suporte para configurar o IP do servidor no Pagar.me.'
      }, { status: 403 })
    }
    
    // Tratamento para outros erros da API Pagar.me
    if (error instanceof Error && error.message.includes('Error (401)')) {
      return NextResponse.json({
        success: false,
        error: 'Erro de autenticação com Pagar.me. Verifique as configurações da API.'
      }, { status: 401 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
