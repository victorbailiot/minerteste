import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { statusSmsSchema } from '@/lib/schemas/sms.schema'
import { SmsDevError, getSmsDevService } from '@/lib/sms-dev'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados inválidos para consulta de SMS'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const parsedParams = statusSmsSchema.parse({
      id: searchParams.get('id') || undefined,
      refer: searchParams.get('refer') || undefined
    })

    const service = getSmsDevService()
    const data = await service.getDeliveryStatus(parsedParams)

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: getValidationError(error) },
        { status: 400 }
      )
    }

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

    console.error('Erro ao consultar status do SMS:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar status do SMS' },
      { status: 500 }
    )
  }
}
