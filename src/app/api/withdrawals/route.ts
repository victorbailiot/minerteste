import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserFinancialData } from '@/lib/business-logic'
import { ParameterService } from '@/lib/parameter-service'
import { ParameterKeys } from '@/types/parameter-keys'
import { isBlacklisted } from '@/lib/blacklist'
import { z } from 'zod'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay } from 'date-fns'
import { compare } from 'bcryptjs'


// Função para validar timezone (verifica se é um timezone válido do IANA)
const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch (error) {
    return false
  }
}

// Schema para validação do saque
const withdrawalSchema = z.object({
  amount: z.number().positive().min(10, 'Valor mínimo é R$ 10,00'),
  pixKeyId: z.string().min(1, 'ID da chave PIX é obrigatório'),
  timezone: z.string().optional().refine(
    (tz) => !tz || isValidTimezone(tz),
    { message: 'Timezone inválido.' }
  ),
  financialPassword: z.string().min(1, 'Senha financeira é obrigatória')
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const body = await request.json()

    // Verificar se usuário está na blacklist para saques
    const blacklistCheck = await isBlacklisted(userId, 'withdrawals', 'request')
    if (blacklistCheck.blocked) {
      return NextResponse.json(
        { error: blacklistCheck.reason || 'Você não está autorizado a solicitar saques.' },
        { status: 403 }
      )
    }
    
    // Validar dados do saque
    const validatedData = withdrawalSchema.parse(body)

    // Verificar e validar senha financeira
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        financialPassword: true
      }
    })

    if (!user?.financialPassword) {
      return NextResponse.json({ 
        error: 'Você precisa criar uma senha financeira antes de realizar saques' 
      }, { status: 400 })
    }

    const isPasswordValid = await compare(validatedData.financialPassword, user.financialPassword)
    if (!isPasswordValid) {
      return NextResponse.json({ 
        error: 'Senha financeira incorreta' 
      }, { status: 400 })
    }
    
    // Verificar se o usuário tem chave PIX ativa no perfil
    const userPixKey = await prisma.pixKey.findFirst({
      where: { userId, excludedAt: null }
    })

    if (!userPixKey) {
      return NextResponse.json({ 
        error: 'Você precisa cadastrar uma chave PIX antes de solicitar saques' 
      }, { status: 400 })
    }

    // Verificar se o pixKeyId corresponde ao usuário
    if (userPixKey.id.toString() !== validatedData.pixKeyId) {
      return NextResponse.json({ 
        error: 'Chave PIX inválida' 
      }, { status: 400 })
    }

    // Verificar se o usuário já fez um saque hoje
    // Usar o fuso horário enviado pelo cliente (detectado do navegador)
    // Se não for enviado, usar UTC como fallback padrão
    const fusoHorarioUsuario = validatedData.timezone || 'UTC'
    const agora = new Date()
    const agoraNoFusoDoUsuario = toZonedTime(agora, fusoHorarioUsuario)

    // Início e fim do dia no fuso horário do usuário
    const inicioDoDiaLocal = startOfDay(agoraNoFusoDoUsuario)
    const fimDoDiaLocal = endOfDay(agoraNoFusoDoUsuario)

    // Converter de volta para UTC para comparar com o banco de dados
    const inicioDoDiaUTC = fromZonedTime(inicioDoDiaLocal, fusoHorarioUsuario)
    const fimDoDiaUTC = fromZonedTime(fimDoDiaLocal, fusoHorarioUsuario)

    const saqueHoje = await prisma.transaction.findFirst({
      where: {
        userId,
        type: 'WITHDRAWAL',
        createdAt: {
          gte: inicioDoDiaUTC,
          lte: fimDoDiaUTC
        }
      }
    })

    if (saqueHoje) {
      return NextResponse.json({ 
        error: 'Você já realizou um saque hoje. Apenas um saque por dia é permitido.' 
      }, { status: 400 })
    }

    // Calcular saldo atual do usuário
    const financialData = await getUserFinancialData(userId)
    const currentBalance = Number(financialData.balance)

    // Buscar parâmetros de saque
    const [taxaPercentual, minAmount] = await Promise.all([
      ParameterService.getNumericParameter(ParameterKeys.WITHDRAWAL_FEE_PERCENTAGE),
      ParameterService.getNumericParameter(ParameterKeys.WITHDRAWAL_MIN_AMOUNT)
    ])
    
    if (taxaPercentual === null || taxaPercentual < 0) {
      return NextResponse.json({ 
        error: 'Taxa de saque não configurada. Contate o administrador.' 
      }, { status: 500 })
    }

    if (minAmount === null || minAmount < 0) {
      return NextResponse.json({ 
        error: 'Valor mínimo de saque não configurado. Contate o administrador.' 
      }, { status: 500 })
    }

    const valorTaxa = validatedData.amount * (taxaPercentual / 100)
    const valorLiquido = validatedData.amount - valorTaxa

    // Verificar se tem saldo suficiente (verifica o valor solicitado, não o líquido)
    if (currentBalance < validatedData.amount) {
      return NextResponse.json({ 
        error: `Saldo insuficiente. Seu saldo atual é R$ ${currentBalance.toFixed(2)}` 
      }, { status: 400 })
    }

    // Verificar valor mínimo usando parâmetro
    if (validatedData.amount < minAmount) {
      return NextResponse.json({ 
        error: `Valor mínimo para saque é R$ ${minAmount.toFixed(2)}` 
      }, { status: 400 })
    }


    // Criar transações usando transação do banco de dados
    const result = await prisma.$transaction(async (tx) => {
      // Criar transação de saque pendente
      const withdrawalTransaction = await tx.transaction.create({
        data: {
          user: {
            connect: { id: userId }
          },
          type: 'WITHDRAWAL',
          amount: validatedData.amount, // Valor solicitado
          taxa: taxaPercentual, // Taxa percentual do parâmetro
          description: `Solicitação de saque - ${userPixKey.bankName} - ${userPixKey.pixKeyType}: ${userPixKey.pixKey} (Valor Solicitado: R$ ${validatedData.amount.toFixed(2)} | Taxa: R$ ${valorTaxa.toFixed(2)} | Líquido: R$ ${valorLiquido.toFixed(2)})`,
          status: 'PENDING'
          // transferId será preenchido pelo admin quando processar
        }
      })

      return { withdrawalTransaction }
    })

    return NextResponse.json({
      success: true,
      message: 'Solicitação de saque criada com sucesso',
      data: {
        id: Number(result.withdrawalTransaction.id),
        amount: Number(result.withdrawalTransaction.amount),
        taxa: Number(result.withdrawalTransaction.taxa),
        valorTaxa: Number(valorTaxa.toFixed(2)),
        valorLiquido: Number(valorLiquido.toFixed(2)),
        status: result.withdrawalTransaction.status,
        requestedAt: result.withdrawalTransaction.createdAt,
        description: result.withdrawalTransaction.description
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Erro ao criar saque:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = { userId }
    if (status) {
      where.status = status
    }

    // Buscar saques do usuário (transações do tipo WITHDRAWAL)
    const [withdrawals, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          ...where,
          type: 'WITHDRAWAL'
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ 
        where: {
          ...where,
          type: 'WITHDRAWAL'
        }
      })
    ])

    return NextResponse.json({
      success: true,
      data: withdrawals.map(withdrawal => ({
        id: Number(withdrawal.id),
        amount: Number(withdrawal.amount),
        taxa: withdrawal.taxa ? Number(withdrawal.taxa) : null,
        status: withdrawal.status,
        requestedAt: withdrawal.createdAt,
        transferId: withdrawal.transferId,
        description: withdrawal.description
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar saques:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 