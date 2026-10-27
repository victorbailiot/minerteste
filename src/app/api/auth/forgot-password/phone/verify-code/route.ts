import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { PhonePasswordResetError, verifyPasswordResetSmsCode } from '@/lib/phone-password-reset'
import { verifyForgotPasswordSmsCodeSchema } from '@/lib/schemas/forgot-password-phone.schema'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados inválidos para validação do código SMS'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = verifyForgotPasswordSmsCodeSchema.parse(body)

    const data = await verifyPasswordResetSmsCode(
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

    if (error instanceof PhonePasswordResetError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details
        },
        { status: error.statusCode }
      )
    }

    console.error('Erro ao validar SMS de recuperação por celular:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao validar SMS de recuperação' },
      { status: 500 }
    )
  }
}
