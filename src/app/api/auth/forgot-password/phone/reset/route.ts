import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { PhonePasswordResetError, resetPasswordWithPhoneVerification } from '@/lib/phone-password-reset'
import { resetPasswordByPhoneSchema } from '@/lib/schemas/forgot-password-phone.schema'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados inválidos para redefinir a senha por celular'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsedBody = resetPasswordByPhoneSchema.parse(body)

    await resetPasswordWithPhoneVerification(
      parsedBody.country,
      parsedBody.documentType,
      parsedBody.documentNumber,
      parsedBody.phoneCountryCode,
      parsedBody.phoneNumber,
      parsedBody.verificationToken,
      parsedBody.password
    )

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso!'
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

    console.error('Erro ao redefinir senha por celular:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao redefinir a senha' },
      { status: 500 }
    )
  }
}
