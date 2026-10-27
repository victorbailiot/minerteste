/**
 * API Route para criar cobranças PIX usando a biblioteca PagarMe
 * Exemplo de uso: POST /api/pagarme/charge
 */

import { NextRequest, NextResponse } from 'next/server'
import { PagarMeAPI, createPagarMeAPI, CreateOrderRequest, Customer, createPixPayment, createOrder, CreateOrderOptions } from '@/lib/pagarme/pagarme'
import { prisma } from '@/lib/prisma'
import { processPackagePurchase } from '@/lib/business-logic'
import { formatPhoneForPagarMe, setupBigIntSerialization } from '@/lib/utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logCurlRequest } from '@/lib/networkUtils'
import { validatePurchaseLimit } from '@/lib/purchase-limit-validator'
import { validatePackageForMinerPurchase } from '@/lib/package-purchase-validator'

// Configurar serialização BigInt para esta rota
setupBigIntSerialization()

// Interface para validação dos dados da cobrança
interface CreateChargeBody {
  valor: number
  descricao: string
  packageId?: number  // ID do pacote sendo comprado
  minerId?: number    // ID da mineradora escolhida
  quantity?: number   // Quantidade de pacotes (padrão: 1)
  identificador?: string
  expiracaoSegundos?: number
  cpf?: string        // CPF do usuário (sobrescreve o do banco se fornecido)
  phone?: string      // Telefone do usuário (sobrescreve o do banco se fornecido)
  informacoesAdicionais?: Array<{
    chave: string
    valor: string
  }>
}

// Função de validação simples
function validarDadosCobranca(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.valor || typeof body.valor !== 'number' || body.valor <= 0) {
    errors.push('Valor deve ser um número maior que 0')
  }

  if (!body.descricao || typeof body.descricao !== 'string' || body.descricao.trim().length === 0) {
    errors.push('Descrição é obrigatória')
  }

  if (body.descricao && body.descricao.length > 140) {
    errors.push('Descrição não pode ter mais de 140 caracteres')
  }

  if (body.quantity && (typeof body.quantity !== 'number' || body.quantity < 1 || body.quantity > 50)) {
    errors.push('Quantidade deve ser um número entre 1 e 50')
  }

  if (body.expiracaoSegundos && (body.expiracaoSegundos < 60 || body.expiracaoSegundos > 86400)) {
    errors.push('Expiração deve estar entre 60 segundos e 24 horas')
  }

  return { isValid: errors.length === 0, errors }
}

export async function POST(request: NextRequest) {
  let packageIdInfo: { chave: string, valor: string } | undefined = undefined
  let packageIdFromInfo: bigint | null = null
  let minerIdInfo: { chave: string, valor: string } | undefined = undefined
  let minerIdFromInfo: bigint | null = null

  try {
    // 1. Verificar autenticação do usuário
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    console.log('Usuário autenticado:', userId)

    // 2. Buscar dados completos do usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        documentNumber: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    console.log('Dados do usuário encontrados:', user)

    // 3. Validar o corpo da requisição
    const body: CreateChargeBody = await request.json()
    console.log('Dados recebidos:', body)
    const validation = validarDadosCobranca(body)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    const { valor, descricao, packageId, identificador, expiracaoSegundos, informacoesAdicionais, quantity, cpf, phone } = body

    console.log('quantity *** ', quantity)
    console.log('CPF fornecido:', cpf ? 'Sim' : 'Não')
    console.log('Telefone fornecido:', phone ? 'Sim' : 'Não')

    if (informacoesAdicionais) {
      packageIdInfo = informacoesAdicionais.find(info => info.chave === 'plan_id')
      if (packageIdInfo && packageIdInfo.valor) {
        packageIdFromInfo = BigInt(packageIdInfo.valor)
      }
      minerIdInfo = informacoesAdicionais.find(info => info.chave === 'miner_id')
      if (minerIdInfo && minerIdInfo.valor) {
        minerIdFromInfo = BigInt(minerIdInfo.valor)
      }
    }

    // Usar packageId das informações adicionais ou do campo direto (para compatibilidade)
    const finalPackageId = packageIdFromInfo || (packageId ? BigInt(packageId) : null)
    const finalMinerId = minerIdFromInfo || (body.minerId ? BigInt(body.minerId) : null)

    // Verificar se o pacote existe (se fornecido)
    if (finalPackageId) {
      if (!finalMinerId) {
        return NextResponse.json(
          { error: 'Mineradora é obrigatória para compra de pacote' },
          { status: 400 }
        )
      }

      const packageExists = await prisma.package.findUnique({
        where: { id: finalPackageId },
        select: { id: true, isActive: true, name: true, price: true }
      })

      if (!packageExists) {
        return NextResponse.json(
          { error: 'Pacote não encontrado' },
          { status: 400 }
        )
      }

      if (!packageExists.isActive) {
        return NextResponse.json(
          { error: 'Pacote não está ativo' },
          { status: 400 }
        )
      }

      const packageValidation = await validatePackageForMinerPurchase({
        userId,
        packageId: finalPackageId,
        minerId: finalMinerId
      })

      if (!packageValidation.valid) {
        return NextResponse.json(
          { error: packageValidation.error || 'Pacote indisponível para a mineradora selecionada' },
          { status: 400 }
        )
      }

      // Validar limite de compra do usuário
      console.log('🔒 Validando limite de compra do usuário...')
      const quantityToBuy = quantity || 1
      const totalForLimit = Number(packageExists.price) * quantityToBuy
      const limitValidation = await validatePurchaseLimit(userId, totalForLimit)
      
      if (!limitValidation.isValid) {
        console.log('❌ Limite de compra excedido')
        return NextResponse.json(
          {
            error: 'Limite de compra excedido',
            message: limitValidation.message,
            details: {
              currentTotal: limitValidation.currentTotal,
              newTotal: limitValidation.newTotal,
              limit: limitValidation.limit,
              remainingAmount: limitValidation.remainingAmount
            }
          },
          { status: 400 }
        )
      }

      console.log('✅ Limite de compra validado com sucesso')
    }

    // 2. Inicializar API PagarMe
    const api = createPagarMeAPI({
      apiKey: process.env.PAGARME_API_KEY!,
      env: process.env.PAGARME_ENV as 'sandbox' | 'production' || 'sandbox'
    })

    if (!api) {
      return NextResponse.json(
        { error: 'Configuração PagarMe não encontrada' },
        { status: 500 }
      )
    }

    // 3. Preparar dados do cliente usando dados do usuário logado ou fornecidos

    // Usar CPF fornecido ou do banco
    const finalCpf = cpf || user.cpf || user.documentNumber || '00000000000'
    
    // Usar telefone fornecido ou do banco
    const finalPhone = phone || user.phone
    
    const phoneData = formatPhoneForPagarMe(finalPhone)
    console.log('Telefone formatado para PagarMe:', phoneData)
    console.log('CPF final:', finalCpf)

    const customerData = {
      name: user.name,
      email: user.email,
      type: 'individual' as const,
      document: finalCpf,
      document_type: 'cpf' as const,
      // Usar home_phone conforme documentação oficial
      phones: {
        home_phone: {
          country_code: '55',
          area_code: phoneData.area_code,
          number: phoneData.number
        }
      }
    }

    // 4. Preparar dados do pedido (conforme documentação oficial PagarMe)

    // Filtrar informações adicionais válidas
    const informacoesValidas = informacoesAdicionais?.filter(info =>
      info.chave && info.valor && info.valor.trim() !== '' && info.valor !== '0'
    ) || []

    // Verificar se é um pedido da loja
    const tipoCompraInfo = informacoesValidas.find(info => info.chave === 'tipo_compra')
    const isLojaOrder = tipoCompraInfo?.valor === 'loja'
    
    // Buscar informações do pedido (se for loja)
    const orderIdInfo = isLojaOrder ? informacoesValidas.find(info => info.chave === 'order_id') : null
    const orderNumberInfo = isLojaOrder ? informacoesValidas.find(info => info.chave === 'order_number') : null
    
    // Preparar metadata base
    const baseMetadata: Record<string, string> = {
      user_id: userId.toString(),
      quantity: quantity?.toString() || "1"
    }

    // Adicionar package_id apenas se for um pacote (não é pedido da loja)
    if (finalPackageId) {
      baseMetadata.package_id = finalPackageId.toString()
    }
    if (finalMinerId) {
      baseMetadata.miner_id = finalMinerId.toString()
    }

    // Se for pedido da loja, adicionar informações do pedido ao metadata
    if (isLojaOrder && orderIdInfo) {
      baseMetadata.tipo_compra = 'loja'
      baseMetadata.order_id = orderIdInfo.valor
      if (orderNumberInfo) {
        baseMetadata.order_number = orderNumberInfo.valor
      }
    }

    // Determinar código do item (prioridade: packageId > orderId > identificador > padrão)
    const itemCode = finalPackageId?.toString() || orderIdInfo?.valor || identificador || 'pix-payment'

    // IMPORTANTE: Pagar.me permite apenas 3 additional_information no PIX
    // Vamos enviar apenas as 3 mais importantes para pedidos da loja
    // As demais informações já estão no metadata do pedido que o webhook pode ler
    let pixAdditionalInfo: Array<{ name: string; value: string }> = []
    
    if (isLojaOrder) {
      // Para pedidos da loja, enviar apenas 3 itens essenciais
      if (tipoCompraInfo) {
        pixAdditionalInfo.push({ name: 'tipo_compra', value: tipoCompraInfo.valor })
      }
      if (orderIdInfo && pixAdditionalInfo.length < 3) {
        pixAdditionalInfo.push({ name: 'order_id', value: orderIdInfo.valor })
      }
      if (orderNumberInfo && pixAdditionalInfo.length < 3) {
        pixAdditionalInfo.push({ name: 'order_number', value: orderNumberInfo.valor })
      }
    } else {
      // Para pacotes, enviar as informações adicionais normalmente (se houver menos de 3)
      if (informacoesValidas.length > 0) {
        pixAdditionalInfo = informacoesValidas.slice(0, 3).map(info => ({
          name: info.chave,
          value: info.valor
        }))
      }
    }

    const orderData: CreateOrderOptions = {
      amount: PagarMeAPI.reaisToCentavos(valor),
      items: [{
        amount: PagarMeAPI.reaisToCentavos(valor)/(quantity || 1),
        description: descricao,
        quantity: quantity || 1,
        code: itemCode,
        type: 'product'
      }],
      customer: customerData,
      metadata: baseMetadata,
      payment: [{
        type: 'pix',
        pix: {
          expires_in: expiracaoSegundos || 3600,
          ...(pixAdditionalInfo.length > 0 && {
            additional_information: pixAdditionalInfo
          })
        }
      }]
    }

    //console.log('Order Data criado:', JSON.stringify(orderData, null, 2))
    logCurlRequest(JSON.stringify(orderData, null, 2))

    // 6. Criar pedido na PagarMe
    const pedido = await createOrder(orderData)
    console.log('Pedido criado na PagarMe:', pedido?.id)
    console.log('Tipo da resposta:', typeof pedido)
    console.log('Keys da resposta:', Object.keys(pedido || {}))

    // 7. Extrair dados do pagamento PIX (a resposta usa 'charges' conforme documentação)
    console.log('Pedido completo recebido:', JSON.stringify(pedido, null, 2))

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

    // 8. Atualizar ou criar transação no banco de dados
    // Se for pedido da loja, verificar se já existe transação no pedido
    let transacao
    let storeOrder: { id: bigint; transactionId: bigint | null; orderNumber: string } | null = null

    if (isLojaOrder && orderIdInfo) {
      // Buscar pedido da loja
      storeOrder = await prisma.storeOrder.findUnique({
        where: { id: BigInt(orderIdInfo.valor) },
        select: { id: true, transactionId: true, orderNumber: true }
      })
      
      if (storeOrder) {
        console.log(`📦 Pedido da loja encontrado: #${storeOrder.orderNumber}`)
        
        // Se o pedido já tem uma transação, atualizar ela
        if (storeOrder.transactionId) {
          console.log(`🔄 Atualizando transação existente: ${storeOrder.transactionId}`)
          transacao = await prisma.transaction.update({
            where: { id: storeOrder.transactionId },
            data: {
              type: 'PIX_PAYMENT',
              amount: valor,
              quantity: body.quantity || 1,
              description: descricao,
              correlationID: pedido.id,
              chargeId: pixChargeData.id,
              pixBrCode: lastTransaction.qr_code || '',
              qrCodeImage: lastTransaction.qr_code_url || '',
              customerName: user.name,
              customerEmail: user.email,
              customerPhone: user.phone,
              customerCpfCnpj: user.cpf,
              status: pixChargeData.status === 'paid' ? 'COMPLETED' : 'PENDING',
              expiresAt: lastTransaction.expires_at ? new Date(lastTransaction.expires_at) : null,
            }
          })
          console.log(`✅ Transação atualizada: ${transacao.id}`)
        } else {
          // Criar nova transação e vincular ao pedido
          console.log(`➕ Criando nova transação para o pedido`)
          transacao = await prisma.transaction.create({
            data: {
              user: {
                connect: { id: userId }
              },
              type: 'PIX_PAYMENT',
              amount: valor,
              quantity: body.quantity || 1,
              description: descricao,
              correlationID: pedido.id,
              chargeId: pixChargeData.id,
              pixBrCode: lastTransaction.qr_code || '',
              qrCodeImage: lastTransaction.qr_code_url || '',
              customerName: user.name,
              customerEmail: user.email,
              customerPhone: user.phone,
              customerCpfCnpj: user.cpf,
              status: pixChargeData.status === 'paid' ? 'COMPLETED' : 'PENDING',
              expiresAt: lastTransaction.expires_at ? new Date(lastTransaction.expires_at) : null,
            }
          })
          
          // Vincular transação ao pedido
          await prisma.storeOrder.update({
            where: { id: storeOrder.id },
            data: { transactionId: transacao.id }
          })
          console.log(`✅ Transação criada e vinculada ao pedido: ${transacao.id}`)
        }
      }
    }
    
    // Se não for pedido da loja ou pedido não encontrado, criar transação normalmente
    if (!transacao) {
      console.log('📝 Criando transação para pacote ou pedido não encontrado')
      transacao = await prisma.transaction.create({
        data: {
          user: {
            connect: { id: userId }
          },
          type: 'PIX_PAYMENT',
          amount: valor,
          quantity: body.quantity || 1,
          description: descricao,
          correlationID: pedido.id,
          chargeId: pixChargeData.id,
          pixBrCode: lastTransaction.qr_code || '',
          qrCodeImage: lastTransaction.qr_code_url || '',
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone,
          customerCpfCnpj: user.cpf,
          status: pixChargeData.status === 'paid' ? 'COMPLETED' : 'PENDING',
          expiresAt: lastTransaction.expires_at ? new Date(lastTransaction.expires_at) : null,
        }
      })
      console.log('✅ Transação criada:', transacao.id)
    }

    

    // 9. Retornar resposta formatada
    return NextResponse.json({
      success: true,
      data: {
        transactionId: Number(transacao.id),
        correlationID: pedido.id,
        status: pixChargeData.status || 'pending',
        valor: PagarMeAPI.centavosToReais(pedido.amount),
        qrCodeImage: lastTransaction.qr_code_url,
        pixCopiaCola: lastTransaction.qr_code,
        expiresAt: lastTransaction.expires_at,
        cliente: {
          name: pedido.customer.name,
          email: pedido.customer.email,
          phone: pedido.customer.phones?.home_phone ?
            `${pedido.customer.phones.home_phone.area_code}${pedido.customer.phones.home_phone.number}` :
            (pedido.customer.phones?.mobile_phone ?
              `${pedido.customer.phones.mobile_phone.area_code}${pedido.customer.phones.mobile_phone.number}` : undefined),
          taxID: pedido.customer.document
        },
        informacoesAdicionais: lastTransaction.additional_information,
        orderId: pedido.id,
        chargeId: pixChargeData.id
      }
    })

  } catch (error) {
    console.error('Erro ao criar cobrança PIX:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error)

    // Tratamento específico para erros da PagarMe
    if (error instanceof Error && error.message.includes('Pagar.me API Error')) {
      return NextResponse.json(
        {
          error: 'Erro na API PagarMe',
          message: error.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível processar a solicitação',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Método GET para consultar uma cobrança
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const correlationID = searchParams.get('correlationID')

    if (!correlationID) {
      return NextResponse.json(
        { error: 'correlationID é obrigatório' },
        { status: 400 }
      )
    }

    console.log('Consultando transação no banco pelo correlationID:', correlationID)

    // Buscar transação no banco de dados
    const transacaoBanco = await prisma.transaction.findFirst({
      where: { correlationID },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        userPackages: {
          include: {
            package: {
              select: { id: true, name: true, price: true, description: true }
            }
          }
        }
      }
    })

    if (!transacaoBanco) {
      return NextResponse.json(
        { error: 'Cobrança não encontrada' },
        { status: 404 }
      )
    }

    console.log('Transação encontrada no banco:', {
      id: transacaoBanco.id,
      status: transacaoBanco.status,
      correlationID: transacaoBanco.correlationID
    })

    // Buscar informações do pacote através da relação UserPackage se existir
    let packageInfo: any = null
    if (transacaoBanco.userPackages && transacaoBanco.userPackages.length > 0) {
      packageInfo = transacaoBanco.userPackages[0].package
    }

    // Retornar dados da transação do banco
    const responseData = {
      transactionId: Number(transacaoBanco.id),
      correlationID: transacaoBanco.correlationID,
      status: transacaoBanco.status, // Usar apenas o status do banco
      valor: Number(transacaoBanco.amount),
      descricao: transacaoBanco.description,
      qrCodeImage: transacaoBanco.qrCodeImage,
      pixCopiaCola: transacaoBanco.pixBrCode,
      expiresAt: transacaoBanco.expiresAt,
      createdAt: transacaoBanco.createdAt,
      updatedAt: transacaoBanco.updatedAt,
      cliente: {
        name: transacaoBanco.customerName,
        email: transacaoBanco.customerEmail,
        phone: transacaoBanco.customerPhone,
        taxID: transacaoBanco.customerCpfCnpj
      },
      package: packageInfo ? {
        id: Number(packageInfo.id),
        name: packageInfo.name,
        price: Number(packageInfo.price),
        description: packageInfo.description
      } : null,
      usuario: transacaoBanco.user ? {
        id: Number(transacaoBanco.user.id),
        name: transacaoBanco.user.name,
        email: transacaoBanco.user.email
      } : null
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Erro ao consultar cobrança PIX:', error)

    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível consultar a cobrança'
      },
      { status: 500 }
    )
  }
} 