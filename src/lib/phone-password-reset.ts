import crypto from 'crypto'

import { type DocumentType, PhoneVerificationPurpose, Prisma } from '@/generated/prisma'
import { validateDocument, validatePhone } from '@/lib/international-utils'
import { prisma } from '@/lib/prisma'
import { getSmsDevService } from '@/lib/sms-dev'
import { hashPassword } from '@/lib/utils'
import type {
  SendPasswordResetSmsCodeResult,
  VerifyPasswordResetSmsCodeResult
} from '@/model/forgot-password'

const PASSWORD_RESET_SMS_CODE_EXPIRATION_MINUTES = 10
const PASSWORD_RESET_SMS_RETRY_AFTER_SECONDS = 60
const PASSWORD_RESET_SMS_MAX_ATTEMPTS = 5

export class PhonePasswordResetError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PhonePasswordResetError'
  }
}

type PasswordResetUser = {
  id: bigint
  name: string
}

const getVerificationSecret = (): string => {
  return (
    process.env.SMS_VERIFICATION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'minerstone-password-reset-sms'
  )
}

const normalizePhone = (phoneCountryCode: string, phoneNumber: string) => ({
  phoneCountryCode: phoneCountryCode.trim(),
  phoneNumber: phoneNumber.replace(/\D/g, '')
})

const normalizeDocumentNumber = (documentNumber: string): string => {
  return documentNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

const buildFullPhoneNumber = (phoneCountryCode: string, phoneNumber: string): string => {
  return `${phoneCountryCode.replace(/\D/g, '')}${phoneNumber.replace(/\D/g, '')}`
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

const findUserByDocumentAndPhone = async (
  country: string,
  documentType: DocumentType,
  documentNumber: string,
  phoneCountryCode: string,
  phoneNumber: string
): Promise<PasswordResetUser | null> => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)
  const normalizedDocumentNumber = normalizeDocumentNumber(documentNumber)
  const fullPhoneNumber = buildFullPhoneNumber(normalizedPhone.phoneCountryCode, normalizedPhone.phoneNumber)

  const users = await prisma.$queryRaw<PasswordResetUser[]>(
    Prisma.sql`
      SELECT "id", "name"
      FROM "users"
      WHERE COALESCE("country", '') = ${country}
        AND COALESCE("documentType"::text, '') = ${documentType}
        AND COALESCE("documentNumber", '') = ${normalizedDocumentNumber}
        AND (
          (
            COALESCE("phoneCountryCode", '') = ${normalizedPhone.phoneCountryCode}
            AND COALESCE("phoneNumber", '') = ${normalizedPhone.phoneNumber}
          )
          OR regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g') IN (${fullPhoneNumber}, ${normalizedPhone.phoneNumber})
        )
      LIMIT 1
    `
  )

  return users[0] || null
}

const validatePhoneResetIdentity = (
  country: string,
  documentType: DocumentType,
  documentNumber: string,
  phoneCountryCode: string,
  phoneNumber: string
) => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)
  const normalizedDocumentNumber = normalizeDocumentNumber(documentNumber)

  if (!validateDocument(documentType, normalizedDocumentNumber, country)) {
    throw new PhonePasswordResetError('Documento inválido para o país selecionado', 400)
  }

  if (!validatePhone(normalizedPhone.phoneNumber, normalizedPhone.phoneCountryCode, country)) {
    throw new PhonePasswordResetError('Telefone inválido para o país selecionado', 400)
  }

  return {
    normalizedPhone,
    normalizedDocumentNumber
  }
}

export const sendPasswordResetSmsCode = async (
  country: string,
  documentType: DocumentType,
  documentNumber: string,
  phoneCountryCode: string,
  phoneNumber: string
): Promise<SendPasswordResetSmsCodeResult> => {
  const { normalizedPhone } = validatePhoneResetIdentity(
    country,
    documentType,
    documentNumber,
    phoneCountryCode,
    phoneNumber
  )

  const user = await findUserByDocumentAndPhone(
    country,
    documentType,
    documentNumber,
    normalizedPhone.phoneCountryCode,
    normalizedPhone.phoneNumber
  )

  if (!user) {
    throw new PhonePasswordResetError('Nenhum cadastro foi encontrado com o documento e celular informados', 404)
  }

  const now = new Date()
  const retryThreshold = new Date(now.getTime() - PASSWORD_RESET_SMS_RETRY_AFTER_SECONDS * 1000)

  const recentVerification = await prisma.phoneVerification.findFirst({
    where: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.PASSWORD_RESET,
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
    const retryAfterSeconds = Math.max(1, PASSWORD_RESET_SMS_RETRY_AFTER_SECONDS - elapsedSeconds)

    throw new PhonePasswordResetError(
      'Aguarde antes de solicitar um novo código por SMS',
      429,
      { retryAfterSeconds }
    )
  }

  await prisma.phoneVerification.deleteMany({
    where: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.PASSWORD_RESET
    }
  })

  const code = generateSmsCode()
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_SMS_CODE_EXPIRATION_MINUTES * 60 * 1000)

  const verification = await prisma.phoneVerification.create({
    data: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.PASSWORD_RESET,
      codeHash: hashSmsCode(code),
      expiresAt,
      maxAttempts: PASSWORD_RESET_SMS_MAX_ATTEMPTS
    }
  })

  try {
    const smsService = getSmsDevService()

    await smsService.sendSms({
      number: buildFullPhoneNumber(normalizedPhone.phoneCountryCode, normalizedPhone.phoneNumber),
      msg: `Minerstone: seu codigo para redefinir a senha e ${code}. Ele expira em ${PASSWORD_RESET_SMS_CODE_EXPIRATION_MINUTES} minutos.`,
      refer: `password-reset-${verification.id.toString()}`
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
    expiresInSeconds: PASSWORD_RESET_SMS_CODE_EXPIRATION_MINUTES * 60,
    retryAfterSeconds: PASSWORD_RESET_SMS_RETRY_AFTER_SECONDS
  }
}

export const verifyPasswordResetSmsCode = async (
  verificationId: string,
  phoneCountryCode: string,
  phoneNumber: string,
  code: string
): Promise<VerifyPasswordResetSmsCodeResult> => {
  const normalizedPhone = normalizePhone(phoneCountryCode, phoneNumber)
  const now = new Date()

  const verification = await prisma.phoneVerification.findFirst({
    where: {
      id: BigInt(verificationId),
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.PASSWORD_RESET
    }
  })

  if (!verification) {
    throw new PhonePasswordResetError('Código de verificação não encontrado', 404)
  }

  if (verification.verifiedAt && verification.verificationToken && verification.expiresAt > now) {
    return {
      verificationToken: verification.verificationToken,
      verifiedAt: verification.verifiedAt.toISOString()
    }
  }

  if (verification.expiresAt <= now) {
    throw new PhonePasswordResetError('O código SMS expirou. Solicite um novo envio.', 400)
  }

  if (verification.attempts >= verification.maxAttempts) {
    throw new PhonePasswordResetError('Você excedeu o limite de tentativas. Solicite um novo código.', 400)
  }

  if (verification.codeHash !== hashSmsCode(code)) {
    const updatedVerification = await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: {
        attempts: {
          increment: 1
        }
      }
    })

    const remainingAttempts = Math.max(0, updatedVerification.maxAttempts - updatedVerification.attempts)

    throw new PhonePasswordResetError('Código SMS inválido', 400, { remainingAttempts })
  }

  const verificationToken = generateVerificationToken()
  const verifiedAt = new Date()

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

export const resetPasswordWithPhoneVerification = async (
  country: string,
  documentType: DocumentType,
  documentNumber: string,
  phoneCountryCode: string,
  phoneNumber: string,
  verificationToken: string,
  password: string
) => {
  const { normalizedPhone } = validatePhoneResetIdentity(
    country,
    documentType,
    documentNumber,
    phoneCountryCode,
    phoneNumber
  )

  const verification = await prisma.phoneVerification.findFirst({
    where: {
      verificationToken,
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.PASSWORD_RESET,
      verifiedAt: {
        not: null
      },
      expiresAt: {
        gt: new Date()
      }
    }
  })

  if (!verification) {
    throw new PhonePasswordResetError('A verificação por SMS é inválida ou expirou', 400)
  }

  const user = await findUserByDocumentAndPhone(
    country,
    documentType,
    documentNumber,
    normalizedPhone.phoneCountryCode,
    normalizedPhone.phoneNumber
  )

  if (!user) {
    throw new PhonePasswordResetError('Nenhum cadastro foi encontrado com o documento e celular informados', 404)
  }

  const hashedPassword = await hashPassword(password)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    }
  })

  await prisma.phoneVerification.deleteMany({
    where: {
      countryCode: normalizedPhone.phoneCountryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      purpose: PhoneVerificationPurpose.PASSWORD_RESET
    }
  })
}
