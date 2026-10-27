/**
 * API Route para criar cobranças PIX usando a biblioteca OpenPix
 * Exemplo de uso: POST /api/openpix/charge
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenPixAPI, createOpenPixAPI, CreateChargeRequest } from '@/lib/openpix'
import { prisma } from '@/lib/prisma'
import { processPackagePurchase } from '@/lib/business-logic'
import { setupBigIntSerialization } from '@/lib/utils'
import { uploadFile, generateUniqueFileName } from '@/lib/firebase'

// Configurar serialização BigInt para esta rota
setupBigIntSerialization()

// Interface para validação dos dados da cobrança
interface CreateChargeBody {
  valor: number
  descricao: string
  packageId?: number  // ID do pacote sendo comprado
  identificador?: string
  cliente?: {
    nome: string
    email?: string
    telefone?: string
    cpfCnpj?: string
    endereco?: {
      cep: string
      rua: string
      numero: string
      bairro: string
      cidade: string
      estado: string
      complemento?: string
    }
  }
  expiracaoSegundos?: number
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

  if (body.cliente?.email && !OpenPixAPI.isValidEmail(body.cliente.email)) {
    errors.push('Email inválido')
  }

  if (body.expiracaoSegundos && (body.expiracaoSegundos < 60 || body.expiracaoSegundos > 86400)) {
    errors.push('Expiração deve estar entre 60 segundos e 24 horas')
  }

  return { isValid: errors.length === 0, errors }
}

export async function POST(request: NextRequest) {
  let packageIdInfo: { chave: string, valor: string } | undefined = undefined
  let packageIdFromInfo: bigint | null = null
  let comprovanteUrl: string | null = null

  try {
    // Verificar se é FormData (pagamento manual) ou JSON (pagamento automático)
    const contentType = request.headers.get('content-type') || ''
    let body: CreateChargeBody

    if (contentType.includes('multipart/form-data')) {
      // Modo manual - processar FormData
      const formData = await request.formData()
      const comprovante = formData.get('comprovante') as File
      const valor = formData.get('valor') as string
      const chavePix = formData.get('chavePix') as string
      const destinatario = formData.get('destinatario') as string
      
      // Extrair dados do requestBody que foram enviados como strings JSON
      const requestBodyData: any = {}
      for (const [key, value] of formData.entries()) {
        if (key !== 'comprovante' && key !== 'valor' && key !== 'chavePix' && key !== 'destinatario') {
          try {
            requestBodyData[key] = JSON.parse(value as string)
          } catch {
            requestBodyData[key] = value
          }
        }
      }

      // Criar body compatível com a interface CreateChargeBody
      body = {
        valor: parseFloat(valor),
        descricao: `Pagamento manual PIX - ${destinatario}`,
        identificador: `manual_${Date.now()}`,
        cliente: requestBodyData.cliente,
        expiracaoSegundos: requestBodyData.expiracaoSegundos || 3600,
        informacoesAdicionais: requestBodyData.informacoesAdicionais || []
      }

      // Upload do comprovante para Firebase Storage
      if (comprovante) {
        try {
          console.log('Iniciando upload do comprovante:', {
            name: comprovante.name,
            size: comprovante.size,
            type: comprovante.type
          })

          // Extrair userId das informações adicionais para criar o path
          const userId = requestBodyData.informacoesAdicionais?.find((info: any) => info.chave === 'usuario_id')?.valor || 'unknown'
          
          // Gerar nome único para o arquivo
          const fileName = generateUniqueFileName(comprovante.name, userId)
          
          // Fazer upload para Firebase Storage
          comprovanteUrl = await uploadFile(comprovante, fileName)
          
          console.log('✅ Comprovante enviado com sucesso para:', comprovanteUrl)
          
        } catch (uploadError) {
          console.error('❌ Erro ao fazer upload do comprovante:', uploadError)
          return NextResponse.json(
            {
              error: 'Erro ao fazer upload do comprovante',
              message: 'Não foi possível salvar o comprovante. Tente novamente.'
            },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          {
            error: 'Comprovante obrigatório',
            message: 'É necessário enviar o comprovante de pagamento.'
          },
          { status: 400 }
        )
      }

    } else {
      // Modo automático - processar JSON
      body = await request.json()
    }

    console.log('Body processado:', body)
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

    const { valor, descricao, packageId, identificador, cliente, expiracaoSegundos, informacoesAdicionais } = body

    // Extrair userId e packageId das informações adicionais
    let userId: bigint | null = null

    console.log('informacoesAdicionais *** ', informacoesAdicionais)

    if (informacoesAdicionais) {
      const userIdInfo = informacoesAdicionais.find(info => info.chave === 'usuario_id')
      if (userIdInfo && userIdInfo.valor) {
        userId = BigInt(userIdInfo.valor)

        // Verificar se o usuário existe
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        })

        if (!userExists) {
          return NextResponse.json(
            { error: 'Usuário não encontrado' },
            { status: 400 }
          )
        }
      }

      packageIdInfo = informacoesAdicionais.find(info => info.chave === 'plan_id')
      if (packageIdInfo && packageIdInfo.valor) {
        packageIdFromInfo = BigInt(packageIdInfo.valor)
      }
    }

    // Usar packageId das informações adicionais ou do campo direto (para compatibilidade)
    const finalPackageId = packageIdFromInfo || (packageId ? BigInt(packageId) : null)

    // Verificar se o pacote existe (se fornecido)
    if (finalPackageId) {
      const packageExists = await prisma.package.findUnique({
        where: { id: finalPackageId },
        select: { id: true, isActive: true }
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
    }

    // 2. Inicializar API OpenPix
    const api = createOpenPixAPI({
      appID: process.env.OPENPIX_APP_ID!,
      env: process.env.OPENPIX_ENV as 'sandbox' | 'production' || 'sandbox'
    })

    if (!api) {
      return NextResponse.json(
        { error: 'Configuração OpenPix não encontrada' },
        { status: 500 }
      )
    }
    console.log(api)

    // 3. Preparar dados da cobrança
    const dadosCobranca: CreateChargeRequest = {
      correlationID: OpenPixAPI.generateCorrelationID('api'),
      value: OpenPixAPI.reaisToCentavos(valor),
      comment: descricao,
      identifier: identificador,
      expiresIn: expiracaoSegundos,
      customer: cliente ? {
        name: cliente.nome,
        email: cliente.email,
        phone: cliente.telefone,
        taxID: cliente.cpfCnpj,
        address: cliente.endereco ? {
          zipcode: cliente.endereco.cep,
          street: cliente.endereco.rua,
          number: cliente.endereco.numero,
          neighborhood: cliente.endereco.bairro,
          city: cliente.endereco.cidade,
          state: cliente.endereco.estado,
          complement: cliente.endereco.complemento
        } : undefined
      } : undefined,
      additionalInfo: informacoesAdicionais?.map(info => ({
        key: info.chave,
        value: info.valor
      }))
    }

    // 4. Criar cobrança na OpenPix
    const cobranca = await api.createCharge(dadosCobranca)

    // 5. Salvar transação no banco de dados
    const transacao = await prisma.transaction.create({
      data: {
        userId: userId, // Usar o userId extraído das informações adicionais
        type: 'PIX_PAYMENT',
        amount: valor,
        description: descricao,
        correlationID: cobranca.charge.correlationID,
        chargeId: cobranca.charge.transactionID,
        pixBrCode: cobranca.charge.brCode,
        qrCodeImage: cobranca.charge.qrCodeImage,
        comprovanteUrl: comprovanteUrl, // URL do comprovante no Firebase Storage
        customerName: cliente?.nome,
        customerEmail: cliente?.email,
        customerPhone: cliente?.telefone,
        customerCpfCnpj: cliente?.cpfCnpj,
        status: 'PENDING',
        expiresAt: cobranca.charge.expiresAt ? new Date(cobranca.charge.expiresAt) : null,
      }
    })

    console.log('Transação salva no banco:', transacao.id)

    // 6. Criar UserPackage inativo se packageId foi fornecido
    //let userPackageCriado: any = null

    /**console.log('packageIdInfo', packageIdFromInfo)
    console.log('userId', userId)
    
    if (packageIdFromInfo && userId) {
      try {
        userPackageCriado = await prisma.userPackage.create({
          data: {
            userId: userId,
            packageId: packageIdFromInfo || 0,
            isActive: false, // Inativo até confirmação do pagamento
            activatedAt: undefined, // Será definido quando ativado
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
            transactionId: transacao.id // Referência à transação que criou este UserPackage
          }
        })
        
        console.log(`✅ UserPackage criado: ID ${userPackageCriado.id} para pacote ${finalPackageId}`)
        
      } catch (error) {
        console.error(`❌ Erro ao criar UserPackage para pacote ${finalPackageId}:`, error)
        return NextResponse.json(
          { error: 'Erro ao criar pacote do usuário' },
          { status: 500 }
        )
      }
    }
    **/

    // 7. Retornar resposta formatada
    return NextResponse.json({
      success: true,
      data: {
        transactionId: Number(transacao.id),
        correlationID: cobranca.charge.correlationID,
        status: cobranca.charge.status,
        valor: OpenPixAPI.centavosToReais(cobranca.charge.value),
        qrCodeImage: cobranca.charge.qrCodeImage,
        pixCopiaCola: cobranca.charge.brCode,
        comprovanteUrl: comprovanteUrl, // Incluir URL do comprovante na resposta
        expiresAt: cobranca.charge.expiresAt,
        cliente: cobranca.charge.customer,
        informacoesAdicionais: cobranca.charge.additionalInfo,
        //userPackageCriado: userPackageCriado ? Number(userPackageCriado.id) : null
      }
    })

  } catch (error) {
    console.error('Erro ao criar cobrança PIX:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error)

    // Tratamento específico para erros da OpenPix
    if (error instanceof Error && error.message.includes('OpenPix API Error')) {
      return NextResponse.json(
        {
          error: 'Erro na API OpenPix',
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
    const chargeId = searchParams.get('chargeId')

    if (!correlationID && !chargeId) {
      return NextResponse.json(
        { error: 'correlationID ou chargeId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar transação no banco de dados
    let transacaoBanco: any = null
    if (correlationID) {
      transacaoBanco = await prisma.transaction.findFirst({
        where: { correlationID },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    }

    if (!transacaoBanco) {
      return NextResponse.json(
        { error: 'Cobrança não encontrada' },
        { status: 404 }
      )
    }

    // Buscar informações do pacote se existir
    let packageInfo: any = null
    if (transacaoBanco?.packageId) {
      packageInfo = await prisma.package.findUnique({
        where: { id: transacaoBanco.packageId },
        select: { id: true, name: true, price: true, description: true }
      })
    }

    // Retornar dados da transação do banco
    const responseData = {
      transactionId: Number(transacaoBanco.id),
      correlationID: transacaoBanco.correlationID,
      status: transacaoBanco.status,
      valor: Number(transacaoBanco.amount),
      descricao: transacaoBanco.description,
      qrCodeImage: transacaoBanco.qrCodeImage,
      pixCopiaCola: transacaoBanco.pixBrCode,
      comprovanteUrl: transacaoBanco.comprovanteUrl, // Incluir URL do comprovante
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