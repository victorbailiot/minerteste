import { z, type ZodError } from 'zod'

export const getFirstZodErrorMessage = (error: ZodError): string => {
  const firstIssue = error.issues[0]
  return firstIssue?.message ?? 'Dados inválidos'
}

const stateSchema = z
  .string()
  .trim()
  .min(2, 'Estado deve ter 2 letras')
  .max(2, 'Estado deve ter 2 letras')
  .regex(/^[A-Za-z]{2}$/, 'Estado deve conter apenas letras')
  .transform((value) => value.toUpperCase())

export const minerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional().default('')
})

export const createMinerSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').max(150, 'Nome muito longo'),
  address: z.string().trim().min(3, 'Endereço é obrigatório').max(255, 'Endereço muito longo'),
  city: z.string().trim().min(2, 'Cidade é obrigatória').max(120, 'Cidade muito longa'),
  state: stateSchema
})

export const updateMinerSchema = createMinerSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Informe ao menos um campo para atualizar'
)

export const minerIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID inválido')
})

export type CreateMinerInput = z.infer<typeof createMinerSchema>
export type UpdateMinerInput = z.infer<typeof updateMinerSchema>
export type MinerListQueryInput = z.infer<typeof minerListQuerySchema>
