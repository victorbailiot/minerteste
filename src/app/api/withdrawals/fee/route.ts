import { NextRequest, NextResponse } from 'next/server'
import { ParameterService } from '@/lib/parameter-service'
import { ParameterKeys } from '@/types/parameter-keys'

/**
 * GET /api/withdrawals/fee
 * Retorna a taxa de saque e valor mínimo configurados no sistema
 */
export async function GET(request: NextRequest) {
  try {
    const [taxaPercentual, minAmount] = await Promise.all([
      ParameterService.getNumericParameter(ParameterKeys.WITHDRAWAL_FEE_PERCENTAGE),
      ParameterService.getNumericParameter(ParameterKeys.WITHDRAWAL_MIN_AMOUNT)
    ])
    
    if (taxaPercentual === null || taxaPercentual < 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Taxa de saque não configurada' 
      }, { status: 500 })
    }

    if (minAmount === null || minAmount < 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Valor mínimo de saque não configurado' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        feePercentage: taxaPercentual,
        feeDecimal: taxaPercentual / 100,
        minAmount: minAmount
      }
    })
  } catch (error) {
    console.error('Erro ao buscar parâmetros de saque:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

