import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { PhoneVerificationError, verifyRegisterSmsCode } from '@/lib/phone-verification'
import { verifyRegisterSmsCodeSchema } from '@/lib/schemas/phone-verification.schema'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados invalidos para validacao do codigo SMS'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = verifyRegisterSmsCodeSchema.parse(body)

    const data = await verifyRegisterSmsCode(
      parsedBody.verificationId,
      parsedBody.phoneCountryCode,
      parsedBody.phoneNumber,
      parsedBody.code
    )

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

    console.error('Erro ao validar codigo SMS do cadastro:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao validar codigo SMS' },
      { status: 500 }
    )
  }
}
