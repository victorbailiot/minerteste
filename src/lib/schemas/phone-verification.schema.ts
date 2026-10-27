import { z } from 'zod'

const phoneCountryCodeSchema = z.string()
  .trim()
  .regex(/^\+\d{1,4}$/, 'O código do país deve estar no formato internacional, como +55')

const phoneNumberSchema = z.string()
  .trim()
  .regex(/^\d{8,15}$/, 'O telefone deve conter entre 8 e 15 dígitos numéricos')

export const sendRegisterSmsCodeSchema = z.object({
  phoneCountryCode: phoneCountryCodeSchema,
  phoneNumber: phoneNumberSchema
})

export const verifyRegisterSmsCodeSchema = z.object({
  verificationId: z.string()
    .trim()
    .regex(/^\d+$/, 'O identificador da verificação é inválido'),
  phoneCountryCode: phoneCountryCodeSchema,
  phoneNumber: phoneNumberSchema,
  code: z.string()
    .trim()
    .regex(/^\d{6}$/, 'O código SMS deve conter 6 dígitos')
})

export type SendRegisterSmsCodeInput = z.infer<typeof sendRegisterSmsCodeSchema>
export type VerifyRegisterSmsCodeInput = z.infer<typeof verifyRegisterSmsCodeSchema>
