import { z } from 'zod'

/**
 * Schema para criação de role
 */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[A-Z_]+$/, 'Nome deve conter apenas letras maiúsculas e underscores'),
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  isActive: z.boolean().optional().default(true),
})

/**
 * Schema para atualização de role
 */
export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[A-Z_]+$/, 'Nome deve conter apenas letras maiúsculas e underscores')
    .optional(),
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  isActive: z.boolean().optional(),
})

/**
 * Schema para atribuir role a usuário
 */
export const assignRoleSchema = z.object({
  roleId: z.string().or(z.number()).or(z.bigint()),
  expiresAt: z.string().datetime().optional().nullable(),
  reason: z.string().max(500).optional(),
}).strict() // Rejeita propriedades extras como userId

/**
 * Schema para remover role de usuário
 */
export const removeRoleSchema = z.object({
  roleId: z.string().or(z.number()).or(z.bigint()),
  reason: z.string().max(500).optional().nullable(),
}).strict() // Rejeita propriedades extras como userId

/**
 * Schema para atribuir permissões a role
 */
export const assignPermissionsToRoleSchema = z.object({
  permissionIds: z.array(z.string().or(z.number()).or(z.bigint())).min(1, 'Selecione pelo menos uma permissão'),
  reason: z.string().max(500).optional().nullable(),
})

/**
 * Schema para remover permissões de role
 */
export const removePermissionsFromRoleSchema = z.object({
  permissionIds: z.array(z.string().or(z.number()).or(z.bigint())).min(1, 'Selecione pelo menos uma permissão'),
  reason: z.string().max(500).optional().nullable(),
})

/**
 * Tipos inferidos dos schemas
 */
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type AssignRoleInput = z.infer<typeof assignRoleSchema>
export type RemoveRoleInput = z.infer<typeof removeRoleSchema>
export type AssignPermissionsToRoleInput = z.infer<typeof assignPermissionsToRoleSchema>
export type RemovePermissionsFromRoleInput = z.infer<typeof removePermissionsFromRoleSchema>

