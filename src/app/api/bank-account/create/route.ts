import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createStripeConnectAccount } from '@/lib/stripe-connect'
import { z } from 'zod'

const createBankAccountSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email(),
  document: z.string().min(11, 'Documento deve ter pelo menos 11 caracteres'),
  type: z.enum(['individual', 'company']),
  bankCode: z.string().min(3, 'Código do banco é obrigatório'),
  branchNumber: z.string().min(1, 'Número da agência é obrigatório'),
  branchCheckDigit: z.string().optional(),
  accountNumber: z.string().min(1, 'Número da conta é obrigatório'),
  accountCheckDigit: z.string().min(1, 'Dígito da conta é obrigatório'),
  accountType: z.enum(['checking', 'savings']),
  holderName: z.string().min(2, 'Nome do titular deve ter pelo menos 2 caracteres'),
  holderType: z.enum(['individual', 'company']),
  holderDocument: z.string().min(11, 'Documento do titular deve ter pelo menos 11 caracteres'),
  transferEnabled: z.boolean().default(false),
  transferInterval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
  transferDay: z.number().optional(),
  anticipationEnabled: z.boolean().default(false),
  anticipationType: z.enum(['full', 'partial']).optional(),
  anticipationVolumePercentage: z.number().optional(),
  anticipationDelay: z.number().optional()
})

const BANK_NAMES: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica Federal',
  '237': 'Bradesco',
  '341': 'Itaú',
  '745': 'Citibank',
  '399': 'HSBC',
  '422': 'Safra',
  '633': 'Rendimento',
  '260': 'Nu Pagamentos'
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // Validar dados de entrada
    const body = await request.json()
    const validatedData = createBankAccountSchema.parse(body)

    // A conta bancária é guardada só no nosso banco: os saques saem pelo Bradesco
    // com estes dados, então não criamos mais recebedor no Pagar.me. O recipientId
    // é obrigatório e único na tabela, por isso usamos um identificador local.
    const recipient = { id: `local_${userId}`, status: 'active' }

    // Criar conta Stripe Connect para o usuário (se STRIPE_SECRET_KEY estiver configurado)
    let stripeAccountId: string | null = null
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeAccountResult = await createStripeConnectAccount({
          email: validatedData.email,
          country: 'BR',
          type: 'express',
          business_type: validatedData.type === 'company' ? 'company' : 'individual',
          metadata: {
            userId: userId.toString(),
            recipientId: recipient.id,
            name: validatedData.name
          }
        })

        if (stripeAccountResult.success && stripeAccountResult.accountId) {
          stripeAccountId = stripeAccountResult.accountId
          console.log('✅ Conta Stripe Connect criada para usuário:', userId, 'Account ID:', stripeAccountId)
        } else {
          console.warn('⚠️ Erro ao criar conta Stripe Connect (não crítico):', stripeAccountResult.error)
          // Não falha o cadastro se Stripe Connect der erro, apenas loga
        }
      } catch (stripeError) {
        console.warn('⚠️ Erro ao criar conta Stripe Connect (não crítico):', stripeError)
        // Não falha o cadastro se Stripe Connect der erro
      }
    } else {
      console.log('ℹ️ STRIPE_SECRET_KEY não configurada, pulando criação de conta Stripe Connect')
    }

    const accountData = {
      userId,
      recipientId: recipient.id,
      recipientName: validatedData.name,
      recipientEmail: validatedData.email,
      recipientDocument: validatedData.document,
      recipientType: validatedData.type,
      recipientStatus: recipient.status,
      bankCode: validatedData.bankCode,
      bankName: BANK_NAMES[validatedData.bankCode] || null,
      branchNumber: validatedData.branchNumber,
      branchCheckDigit: validatedData.branchCheckDigit || null,
      accountNumber: validatedData.accountNumber,
      accountCheckDigit: validatedData.accountCheckDigit,
      accountType: validatedData.accountType,
      holderName: validatedData.holderName,
      holderType: validatedData.holderType,
      holderDocument: validatedData.holderDocument,
      transferEnabled: validatedData.transferEnabled,
      transferInterval: validatedData.transferInterval,
      transferDay: validatedData.transferDay || null,
      anticipationEnabled: validatedData.anticipationEnabled,
      anticipationType: validatedData.anticipationType || null,
      anticipationVolumePercentage: validatedData.anticipationVolumePercentage || null,
      anticipationDelay: validatedData.anticipationDelay || null,
    }

    // Salvar no banco de dados local (upsert para suportar edição)
    const bankAccount = await prisma.$transaction(async (tx) => {
      const newBankAccount = await tx.bankAccount.upsert({
        where: { userId },
        create: accountData,
        update: {
          ...accountData,
          userId: undefined, // não atualiza o userId no update
          excludedAt: null, // reativa cadastro após remoção pelo perfil
        },
      })

      // Atualizar usuário com stripe_account_id se foi criado
      if (stripeAccountId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            stripeAccountId: stripeAccountId
          }
        })
      }

      return newBankAccount
    })

    return NextResponse.json({
      success: true,
      bankAccount: {
        id: bankAccount.id.toString(),
        recipientId: bankAccount.recipientId,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountCheckDigit: bankAccount.accountCheckDigit,
        holderName: bankAccount.holderName
      }
    })

  } catch (error) {
    console.error('Erro ao criar conta bancária:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}