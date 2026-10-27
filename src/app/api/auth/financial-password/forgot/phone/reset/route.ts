import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ZodError } from 'zod'

import { authOptions } from '@/lib/auth'
import {
  PhoneFinancialPasswordResetError,
  resetFinancialPasswordWithPhoneVerification
} from '@/lib/phone-financial-password-reset'
import { resetFinancialPasswordByPhoneSchema } from '@/lib/schemas/forgot-financial-password-phone.schema'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados inválidos para redefinir a senha financeira por celular'
}

/**
 * POST /api/auth/financial-password/forgot/phone/reset
 * Redefine a senha financeira após verificação por SMS.
 * Requer usuário autenticado.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsedBody = resetFinancialPasswordByPhoneSchema.parse(body)

    await resetFinancialPasswordWithPhoneVerification(
      BigInt(session.user.id),
      parsedBody.country,
      parsedBody.documentType,
      parsedBody.documentNumber,
      parsedBody.phoneCountryCode,
      parsedBody.phoneNumber,
      parsedBody.verificationToken,
      parsedBody.financialPassword
    )

    return NextResponse.json({
      success: true,
      message: 'Senha financeira alterada com sucesso!'
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

    console.error('Erro ao redefinir senha financeira por celular:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao redefinir a senha financeira' },
      { status: 500 }
    )
  }
}
