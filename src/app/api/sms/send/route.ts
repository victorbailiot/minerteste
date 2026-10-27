import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { sendSmsBodySchema } from '@/lib/schemas/sms.schema'
import { SmsDevError, getSmsDevService } from '@/lib/sms-dev'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados inválidos para envio de SMS'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = sendSmsBodySchema.parse(body)
    const service = getSmsDevService()

    const messages = 'messages' in parsedBody ? parsedBody.messages : [parsedBody]
    const data = await service.sendSms(messages.length === 1 ? messages[0] : messages)

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

    console.error('Erro ao enviar SMS:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao enviar SMS' },
      { status: 500 }
    )
  }
}
