import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCardToken } from '@/lib/pagarme/pagarme'

// Schema de validação para os dados do cartão
const cardDataSchema = z.object({
  number: z.string().min(13).max(19),
  holderName: z.string().min(3),
  expMonth: z.string().min(1).max(2),
  expYear: z.string().min(4).max(4),
  cvv: z.string().min(3).max(4)
})

const tokenizeCardSchema = z.object({
  cardData: cardDataSchema
})

/**
 * POST /api/pagarme/tokenize-card
 * Tokenizar cartão via API Pagar.me
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Tokenizando cartão via API...')

    // 1. Validar request
    const body = await request.json()
    console.log('📝 Dados recebidos:', JSON.stringify(body, null, 2))
    
    const validation = tokenizeCardSchema.safeParse(body)

    if (!validation.success) {
      console.error('❌ Validação falhou:', validation.error)
      console.error('❌ Erros de validação:', validation.error.issues)
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { cardData } = validation.data

    // 2. Criar token via função utilitária
    const token = await createCardToken({
      number: cardData.number,
      holder_name: cardData.holderName,
      exp_month: parseInt(cardData.expMonth),
      exp_year: parseInt(cardData.expYear),
      cvv: cardData.cvv
    })

    return NextResponse.json({ success: true, data: { token } })

  } catch (error: any) {
    console.error('❌ Erro ao tokenizar cartão:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao processar tokenização'
      },
      { status: 500 }
    )
  }
}
