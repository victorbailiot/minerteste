import { NextRequest, NextResponse } from 'next/server'
import { getUserFinancialData } from '@/lib/business-logic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId') || '4'
    const userId = BigInt(userIdParam)

    console.log(`🔍 Final check para User ${userId}`)

    // Testar função integrada
    const result = await getUserFinancialData(userId)
    
    console.log('📊 Resultado completo:', result)

    return NextResponse.json({
      success: true,
      userId: Number(userId),
      result
    })

  } catch (error) {
    console.error('❌ Erro no final check:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 