import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PAGARME_INTEREST_TABLE, calculateTotalWithInterest, calculateInstallmentAmount, hasInterest, getInterestRatePercent } from '@/lib/pagarme/pagarme-config'

// ===== SCHEMA DE VALIDAÇÃO =====

const calculateInstallmentsSchema = z.object({
  amount: z.number().positive(),
  maxInstallments: z.number().int().min(1).max(12).default(3)
})

// ===== HANDLER =====

/**
 * GET /api/pagarme/calculate-installments
 * Calcular valores das parcelas com juros
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const amount = Number(searchParams.get('amount'))
    const maxInstallments = Number(searchParams.get('maxInstallments')) || 3

    // Validar dados
    const validation = calculateInstallmentsSchema.safeParse({
      amount,
      maxInstallments
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error
        },
        { status: 400 }
      )
    }

    // Calcular parcelas usando a tabela centralizada
    const installments: any[] = []

    for (let i = 1; i <= maxInstallments; i++) {
      const totalAmount = calculateTotalWithInterest(amount, i)
      const installmentAmount = calculateInstallmentAmount(amount, i)
      const hasInterestFlag = hasInterest(i)
      const interestRate = getInterestRatePercent(i)

      installments.push({
        installment: i,
        installmentAmount: Math.round(installmentAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        hasInterest: hasInterestFlag,
        interestRate: interestRate,
        label: `${i}x de ${formatCurrency(installmentAmount)}`
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        amount,
        installments
      }
    })

  } catch (error) {
    console.error('❌ Erro ao calcular parcelas:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao calcular parcelas'
      },
      { status: 500 }
    )
  }
}

/**
 * Formatar valor em moeda BRL
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

