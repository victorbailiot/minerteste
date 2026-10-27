import crypto from 'crypto'

import { Prisma, PhoneVerificationPurpose } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { getSmsDevService } from '@/lib/sms-dev'
import type { SendRegisterSmsCodeResult, VerifyRegisterSmsCodeResult } from '@/model/phone-verification'

const REGISTER_SMS_CODE_EXPIRATION_MINUTES = 10
const REGISTER_SMS_RETRY_AFTER_SECONDS = 60
const REGISTER_SMS_MAX_ATTEMPTS = 5

export class PhoneVerificationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PhoneVerificationError'
  }
}

const getVerificationSecret = (): string => {
  return (
    process.env.SMS_VERIFICATION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'minerstone-register-sms'
  )
}

const normalizePhone = (phoneCountryCode: string, phoneNumber: string) => ({
  phoneCountryCode: phoneCountryCode.trim(),
  phoneNumber: phoneNumber.replace(/\D/g, '')
})

const buildFullPhoneNumber = (phoneCountryCode: string, phoneNumber: string): string => {
  return `${phoneCountryCode.replace(/\D/g, '')}${phoneNumber.replace(/\D/g, '')}`
}

export const isPhoneAlreadyRegistered = async (
  phoneCountryCode: string,
  phoneNumber: string
): Promise<boolean> => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)
  const fullPhoneNumber = buildFullPhoneNumber(normalizedPhone.phoneCountryCode, normalizedPhone.phoneNumber)

  const users = await prisma.$queryRaw<Array<{ id: bigint }>>(
    Prisma.sql`
      SELECT "id"
      FROM "users"
      WHERE (
        "phoneCountryCode" = ${normalizedPhone.phoneCountryCode}
        AND "phoneNumber" = ${normalizedPhone.phoneNumber}
      )
      OR regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g') IN (${fullPhoneNumber}, ${normalizedPhone.phoneNumber})
      LIMIT 1
    `
  )

  return users.length > 0
}

const generateSmsCode = (): string => {
  return crypto.randomInt(100000, 1000000).toString()
}

const hashSmsCode = (code: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${code}:${getVerificationSecret()}`)
    .digest('hex')
}

const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

export const sendRegisterSmsCode = async (
  phoneCountryCode: string,
  phoneNumber: string
): Promise<SendRegisterSmsCodeResult> => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)
  const now = new Date()
  const retryThreshold = new Date(now.getTime() - REGISTER_SMS_RETRY_AFTER_SECONDS * 1000)

  const phoneAlreadyRegistered = await isPhoneAlreadyRegistered(
    normalizedPhone.phoneCountryCode,
    normalizedPhone.phoneNumber
  )

  if (phoneAlreadyRegistered) {
    throw new PhoneVerificationError(
      'Este telefone ja esta cadastrado. Use outro numero para continuar.',
      409
    )
  }

  const recentVerification = await prisma.phoneVerification.findFirst({
    where: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.REGISTER,
      verifiedAt: null,
      createdAt: {
        gt: retryThreshold
      },
      expiresAt: {
        gt: now
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (recentVerification) {
    const elapsedSeconds = Math.floor((now.getTime() - recentVerification.createdAt.getTime()) / 1000)
    const retryAfterSeconds = Math.max(1, REGISTER_SMS_RETRY_AFTER_SECONDS - elapsedSeconds)

    throw new PhoneVerificationError(
      'Aguarde antes de solicitar um novo codigo por SMS',
      429,
      { retryAfterSeconds }
    )
  }

  await prisma.phoneVerification.deleteMany({
    where: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.REGISTER
    }
  })

  const code = generateSmsCode()
  const expiresAt = new Date(now.getTime() + REGISTER_SMS_CODE_EXPIRATION_MINUTES * 60 * 1000)

  const verification = await prisma.phoneVerification.create({
    data: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.REGISTER,
      codeHash: hashSmsCode(code),
      expiresAt,
      maxAttempts: REGISTER_SMS_MAX_ATTEMPTS
    }
  })

  try {
    const smsService = getSmsDevService()

    await smsService.sendSms({
      number: buildFullPhoneNumber(normalizedPhone.phoneCountryCode, normalizedPhone.phoneNumber),
      msg: `Minerstone: seu codigo de verificacao e ${code}. Ele expira em ${REGISTER_SMS_CODE_EXPIRATION_MINUTES} minutos.`,
      refer: `register-${verification.id.toString()}`
    })
  } catch (error) {
    await prisma.phoneVerification.delete({
      where: { id: verification.id }
    })

    throw error
  }

  return {
    verificationId: verification.id.toString(),
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: REGISTER_SMS_CODE_EXPIRATION_MINUTES * 60,
    retryAfterSeconds: REGISTER_SMS_RETRY_AFTER_SECONDS
  }
}

export const verifyRegisterSmsCode = async (
  verificationId: string,
  phoneCountryCode: string,
  phoneNumber: string,
  code: string
): Promise<VerifyRegisterSmsCodeResult> => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)
  const now = new Date()

  const verification = await prisma.phoneVerification.findFirst({
    where: {
      id: BigInt(verificationId),
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.REGISTER
    }
  })

  if (!verification) {
    throw new PhoneVerificationError('Codigo de verificacao nao encontrado', 404)
  }

  if (verification.verifiedAt && verification.verificationToken && verification.expiresAt > now) {
    return {
      verificationToken: verification.verificationToken,
      verifiedAt: verification.verifiedAt.toISOString()
    }
  }

  if (verification.expiresAt <= now) {
    throw new PhoneVerificationError('O codigo SMS expirou. Solicite um novo envio.', 400)
  }

  if (verification.attempts >= verification.maxAttempts) {
    throw new PhoneVerificationError('Voce excedeu o limite de tentativas. Solicite um novo codigo.', 400)
  }

  const hashedCode = hashSmsCode(code)

  if (verification.codeHash !== hashedCode) {
    const updatedVerification = await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: {
        attempts: {
          increment: 1
        }
      }
    })

    const remainingAttempts = Math.max(0, updatedVerification.maxAttempts - updatedVerification.attempts)

    throw new PhoneVerificationError(
      'Codigo SMS invalido',
      400,
      { remainingAttempts }
    )
  }

  const verifiedAt = new Date()
  const verificationToken = generateVerificationToken()

  const updatedVerification = await prisma.phoneVerification.update({
    where: { id: verification.id },
    data: {
      verifiedAt,
      verificationToken
    }
  })

  return {
    verificationToken: updatedVerification.verificationToken!,
    verifiedAt: updatedVerification.verifiedAt!.toISOString()
  }
}

export const ensureRegisterPhoneVerified = async (
  verificationToken: string,
  phoneCountryCode: string,
  phoneNumber: string
) => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)

  const verification = await prisma.phoneVerification.findFirst({
    where: {
      verificationToken,
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.REGISTER,
      verifiedAt: {
        not: null
      },
      expiresAt: {
        gt: new Date()
      }
    }
  })

  if (!verification) {
    throw new PhoneVerificationError('Telefone nao verificado por SMS ou verificacao expirada', 400)
  }

  return verification
}

export const clearRegisterPhoneVerification = async (
  phoneCountryCode: string,
  phoneNumber: string
) => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)

  await prisma.phoneVerification.deleteMany({
    where: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.REGISTER
    }
  })
}
