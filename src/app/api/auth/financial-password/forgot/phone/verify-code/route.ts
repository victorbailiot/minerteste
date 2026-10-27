import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import {
  PhoneFinancialPasswordResetError,
  verifyFinancialPasswordResetSmsCode
} from '@/lib/phone-financial-password-reset'
import { verifyForgotFinancialPasswordSmsCodeSchema } from '@/lib/schemas/forgot-financial-password-phone.schema'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados inválidos para validação do código SMS'
}

/**
 * POST /api/auth/financial-password/forgot/phone/verify-code
 * Valida o código SMS e retorna token para redefinir a senha financeira.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = verifyForgotFinancialPasswordSmsCodeSchema.parse(body)

    const data = await verifyFinancialPasswordResetSmsCode(
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

    if (error instanceof PhoneFinancialPasswordResetError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error.details
        },
        { status: error.statusCode }
      )
    }

    console.error('Erro ao validar SMS de recuperação de senha financeira por celular:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao validar SMS de recuperação' },
      { status: 500 }
    )
  }
}
