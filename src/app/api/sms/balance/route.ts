import { NextResponse } from 'next/server'

import { SmsDevError, getSmsDevService } from '@/lib/sms-dev'

export async function GET() {
  try {
    const service = getSmsDevService()
    const data = await service.getBalance()

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    if (error instanceof SmsDevError) {
      const status = error.statusCode ? 502 : 500

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.response
        },
        { status }
      )
    }

    console.error('Erro ao consultar saldo de SMS:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar saldo de SMS' },
      { status: 500 }
    )
  }
}
