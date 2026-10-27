import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ZodError } from 'zod'

import { authOptions } from '@/lib/auth'
import {
  PhoneFinancialPasswordResetError,
  sendFinancialPasswordResetSmsCode
} from '@/lib/phone-financial-password-reset'
import { sendForgotFinancialPasswordSmsCodeSchema } from '@/lib/schemas/forgot-financial-password-phone.schema'
import { SmsDevError } from '@/lib/sms-dev'

const getValidationError = (error: ZodError): string => {
  return error.issues[0]?.message || 'Dados inválidos para envio do código SMS'
}

/**
 * POST /api/auth/financial-password/forgot/phone/send-code
 * Envia código SMS para recuperação de senha financeira.
 * Requer usuário autenticado; documento e celular devem corresponder à conta.
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
    const parsedBody = sendForgotFinancialPasswordSmsCodeSchema.parse(body)

    const data = await sendFinancialPasswordResetSmsCode(
      BigInt(session.user.id),
      parsedBody.country,
      parsedBody.documentType,
      parsedBody.documentNumber,
      parsedBody.phoneCountryCode,
      parsedBody.phoneNumber
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

    if (error instanceof SmsDevError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível enviar o SMS de recuperação',
          details: error.response
        },
        { status: 502 }
      )
    }

    console.error('Erro ao enviar SMS de recuperação de senha financeira por celular:', error)

    return NextResponse.json(
      { success: false, error: 'Erro interno ao enviar SMS de recuperação' },
      { status: 500 }
    )
  }
}
