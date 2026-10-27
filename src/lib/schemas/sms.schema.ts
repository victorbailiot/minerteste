import { z } from 'zod'

const phoneRegex = /^\d{10,15}$/

export const sendSmsMessageSchema = z.object({
  number: z.string()
    .trim()
    .regex(phoneRegex, 'O telefone deve conter entre 10 e 15 dígitos numéricos'),
  msg: z.string()
    .trim()
    .min(1, 'A mensagem é obrigatória')
    .max(1600, 'A mensagem deve ter no máximo 1600 caracteres'),
  refer: z.string()
    .trim()
    .max(100, 'A referência deve ter no máximo 100 caracteres')
    .optional(),
  jobdate: z.string()
    .trim()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'A data de agendamento deve estar no formato DD/MM/AAAA')
    .optional(),
  jobtime: z.string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'A hora de agendamento deve estar no formato HH:mm')
    .optional(),
  type: z.number()
    .int('O tipo do serviço deve ser um número inteiro')
    .positive('O tipo do serviço deve ser maior que zero')
    .optional()
})

export const sendSmsBodySchema = z.union([
  sendSmsMessageSchema,
  z.object({
    messages: z.array(sendSmsMessageSchema)
      .min(1, 'Informe ao menos uma mensagem')
      .max(100, 'Envie no máximo 100 mensagens por requisição')
  })
])

export const cancelSmsSchema = z.object({
  id: z.string().trim().min(1, 'O id da mensagem é obrigatório').optional(),
  refer: z.string().trim().min(1, 'A referência é obrigatória').optional()
}).refine((value) => value.id || value.refer, {
  message: 'Informe o id ou a referência da mensagem'
})

export const statusSmsSchema = z.object({
  id: z.string().trim().min(1, 'O id da mensagem é obrigatório').optional(),
  refer: z.string().trim().min(1, 'A referência é obrigatória').optional()
}).refine((value) => value.id || value.refer, {
  message: 'Informe o id ou a referência da mensagem'
})

export type SendSmsBodyInput = z.infer<typeof sendSmsBodySchema>
export type SendSmsMessageInput = z.infer<typeof sendSmsMessageSchema>
export type CancelSmsInput = z.infer<typeof cancelSmsSchema>
export type StatusSmsInput = z.infer<typeof statusSmsSchema>
