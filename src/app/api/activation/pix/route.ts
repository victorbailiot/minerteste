import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPagarMeAPI, createPixPayment, PagarMeAPI } from '@/lib/pagarme/pagarme'
import { Decimal } from '@prisma/client/runtime/library'
import { ParameterKeys } from '@/types/parameter-keys'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { formatPhoneForPagarMe } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Obter sessão do usuário logado
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Não autenticado' 
      }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        cpf: true
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Buscar pacote ativo do usuário para obter o valor de reativação
    const activePackage = await prisma.userPackage.findFirst({
      where: {
        userId,
        isActive: true
      },
      include: {
        package: true
      },
      orderBy: {
        activatedAt: 'desc'
      }
    })

    // Usar o valor de reativação do pacote ou o valor padrão do parâmetro
    const pixAmountParam = await prisma.parameter.findUnique({
      where: { key: ParameterKeys.ACTIVATION_PIX_AMOUNT }
    })
    
    const defaultAmount = pixAmountParam ? new Decimal(pixAmountParam.value) : new Decimal(100)
    const pixAmount = activePackage?.package.reactivationAmount || defaultAmount

    // Verificar se usuário já tem ativação ativa
    const existingActivation = await prisma.userActivation.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (existingActivation) {
      return NextResponse.json({
        success: false,
        error: 'Usuário já possui ativação ativa'
      }, { status: 400 })
    }

    // Gerar código único para o pedido
    const orderCode = PagarMeAPI.generateOrderCode('activation')

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

    const phoneData = formatPhoneForPagarMe(user.phone)
    console.log('Telefone formatado para PagarMe:', phoneData)

    // Preparar dados do cliente
    const customerData = {
      name: user.name,
      email: user.email,
      type: 'individual' as const,
      document: user.cpf || '00000000000', // CPF do usuário ou padrão
      document_type: 'cpf' as const,
      phones: user.phone ? {
        mobile_phone: {
          country_code: '55',
          area_code: phoneData.area_code,
          number: phoneData.number
        }
      } : {},
      metadata: {
        user_id: userId.toString(),
        transaction_type: 'activation'
      }
    }

    // Preparar dados do pagamento PIX
    const pixPayment = {
      payment_method: 'pix' as const,
      pix: {
        expires_in: (24 * 60 * 60).toString(), // 24 horas
        additional_information: [
          { name: 'user_id', value: userId.toString() },
          { name: 'transaction_type', value: 'activation' }
        ]
      }
    }

    // Preparar dados do pedido
    const orderData = {
      code: PagarMeAPI.generateOrderCode('activation'),
      amount: PagarMeAPI.reaisToCentavos(Number(pixAmount)),
      currency: 'BRL' as const,
      customer: customerData,
      payments: [pixPayment],
             items: [{
         amount: PagarMeAPI.reaisToCentavos(Number(pixAmount)),
         description: 'Ativação Mensal - Sistema MMN',
         quantity: 1,
         code: 'activation'
       }],
      closed: true,
      metadata: {
        user_id: userId.toString(),
        transaction_type: 'activation'
      }
    }

    // Criar pedido na PagarMe
    const pedido = await api.createOrder(orderData)
    console.log('Pedido de ativação criado na PagarMe:', pedido.id)

    // Extrair dados do pagamento PIX (a resposta usa 'charges' conforme documentação)
    if (!pedido.charges || !Array.isArray(pedido.charges)) {
      throw new Error('Resposta da PagarMe não contém array de charges')
    }
    
    const pixChargeData = pedido.charges.find(charge => 
      charge.payment_method === 'pix'
    )
    if (!pixChargeData) {
      throw new Error('Charge PIX não encontrado na resposta')
    }

    // Extrair dados do PIX da última transação
    const lastTransaction = pixChargeData.last_transaction
    if (!lastTransaction) {
      throw new Error('Transação PIX não encontrada na resposta')
    }

    // Verificar se o pagamento falhou por configuração de ambiente
    if (pixChargeData.status === 'refused') {
      throw new Error('PIX não configurado na conta PagarMe. Verifique as configurações de PIX no dashboard da PagarMe.')
    }

    // Registrar transação pendente
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'ACTIVATION_PIX',
        amount: pixAmount,
        description: 'Ativação mensal via PIX',
        correlationID: pedido.id,
        chargeId: pixChargeData.id,
        pixBrCode: lastTransaction.qr_code || '',
        qrCodeImage: lastTransaction.qr_code_url || '',
        status: pixChargeData.status === 'paid' ? 'COMPLETED' : 'PENDING',
        expiresAt: lastTransaction.expires_at ? new Date(lastTransaction.expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        transactionId: Number(transaction.id),
        correlationID: pedido.id,
        pixBrCode: lastTransaction.qr_code || '',
        qrCodeImage: lastTransaction.qr_code_url || '',
        amount: Number(pixAmount),
        expiresAt: transaction.expiresAt
      }
    })
  } catch (error) {
    console.error('Erro ao gerar cobrança PIX para ativação:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 