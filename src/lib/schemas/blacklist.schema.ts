import { z } from 'zod'

const resourceActionSchema = z.object({
  resource: z.string()
    .min(1, 'Recurso é obrigatório')
    .max(100, 'Recurso deve ter no máximo 100 caracteres'),
  action: z.string()
    .max(100, 'Ação deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
})

export const addBlacklistSchema = z.object({
  userId: z.union([
    z.string().min(1, 'ID do usuário é obrigatório'),
    z.number().int().positive(),
    z.bigint()
  ]).transform(val => (typeof val === 'string' || typeof val === 'number') ? BigInt(val) : val),
  /** Múltiplos recursos: cria uma entrada por item */
  resources: z.array(resourceActionSchema)
    .min(1, 'Selecione ao menos um recurso'),
  reason: z.string()
    .min(10, 'Motivo deve ter no mínimo 10 caracteres')
    .max(1000, 'Motivo deve ter no máximo 1000 caracteres'),
  expiresAt: z.union([
    z.string().datetime('Data de expiração inválida'),
    z.date()
  ])
    .optional()
    .nullable()
    .transform(val => {
      if (!val) return null
      if (typeof val === 'string') return new Date(val)
      return val
    })
})

export const updateBlacklistSchema = z.object({
  reason: z.string()
    .min(10, 'Motivo deve ter no mínimo 10 caracteres')
    .max(1000, 'Motivo deve ter no máximo 1000 caracteres')
    .optional(),
  expiresAt: z.union([
    z.string().datetime('Data de expiração inválida'),
    z.date(),
    z.null()
  ])
    .optional()
    .transform(val => {
      if (val === null || val === undefined) return undefined
      if (typeof val === 'string') return new Date(val)
      return val
    }),
  isActive: z.boolean().optional(),
  /** Lista de recursos bloqueados ao editar (sincroniza todas as entradas do usuário) */
  resources: z.array(resourceActionSchema)
    .min(1, 'Selecione ao menos um recurso')
    .optional()
})

export const queryBlacklistSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  userId: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  includeExpired: z.enum(['true', 'false']).optional().default('false')
})

export type AddBlacklistInput = z.infer<typeof addBlacklistSchema>
export type UpdateBlacklistInput = z.infer<typeof updateBlacklistSchema>
export type QueryBlacklistInput = z.infer<typeof queryBlacklistSchema>
