import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { PhoneVerificationError, sendRegisterSmsCode } from '@/lib/phone-verification'
import { sendRegisterSmsCodeSchema } from '@/lib/schemas/phone-verification.schema'
import { SmsDevError } from '@/lib/sms-dev'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados invalidos para envio do codigo SMS'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = sendRegisterSmsCodeSchema.parse(body)
    const data = await sendRegisterSmsCode(parsedBody.phoneCountryCode, parsedBody.phoneNumber)

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

    if (error instanceof PhoneVerificationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details
        },
        { status: error.statusCode }
      )
    }

    if (error instanceof SmsDevError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nao foi possivel enviar o SMS de verificacao',
          details: error.response
        },
        { status: 502 }
      )
    }

    console.error('Erro ao enviar codigo SMS do cadastro:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao enviar codigo SMS' },
      { status: 500 }
    )
  }
}
