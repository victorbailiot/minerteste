import { z } from 'zod'

import { DocumentType } from '@/generated/prisma'

const phoneCountryCodeSchema = z.string()
  .trim()
  .regex(/^\+\d{1,4}$/, 'O código do país deve estar no formato internacional, como +55')

const phoneNumberSchema = z.string()
  .trim()
  .regex(/^\d{8,15}$/, 'O telefone deve conter entre 8 e 15 dígitos numéricos')

const documentNumberSchema = z.string()
  .trim()
  .min(3, 'O documento é obrigatório')
  .max(50, 'O documento deve ter no máximo 50 caracteres')

export const sendForgotFinancialPasswordSmsCodeSchema = z.object({
  country: z.string().trim().length(2, 'País inválido'),
  documentType: z.nativeEnum(DocumentType, {
    error: 'Selecione um tipo de documento válido'
  }),
  documentNumber: documentNumberSchema,
  phoneCountryCode: phoneCountryCodeSchema,
  phoneNumber: phoneNumberSchema
})

export const verifyForgotFinancialPasswordSmsCodeSchema = z.object({
  verificationId: z.string()
    .trim()
    .regex(/^\d+$/, 'O identificador da verificação é inválido'),
  phoneCountryCode: phoneCountryCodeSchema,
  phoneNumber: phoneNumberSchema,
  code: z.string()
    .trim()
    .regex(/^\d{6}$/, 'O código SMS deve conter 6 dígitos')
})

export const resetFinancialPasswordByPhoneSchema = z.object({
  country: z.string().trim().length(2, 'País inválido'),
  documentType: z.nativeEnum(DocumentType, {
    error: 'Selecione um tipo de documento válido'
  }),
  documentNumber: documentNumberSchema,
  phoneCountryCode: phoneCountryCodeSchema,
  phoneNumber: phoneNumberSchema,
  verificationToken: z.string()
    .trim()
    .min(1, 'O token da verificação é obrigatório'),
  financialPassword: z.string()
    .min(4, 'A senha financeira deve ter pelo menos 4 caracteres')
    .max(20, 'A senha financeira deve ter no máximo 20 caracteres')
})

export type SendForgotFinancialPasswordSmsCodeInput = z.infer<typeof sendForgotFinancialPasswordSmsCodeSchema>
export type VerifyForgotFinancialPasswordSmsCodeInput = z.infer<typeof verifyForgotFinancialPasswordSmsCodeSchema>
export type ResetFinancialPasswordByPhoneInput = z.infer<typeof resetFinancialPasswordByPhoneSchema>
