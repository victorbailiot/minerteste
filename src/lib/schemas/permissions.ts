import { z } from 'zod'

/**
 * Schema para conceder permissão individual a usuário
 */
export const grantUserPermissionSchema = z.object({
  permissionId: z.string().or(z.number()).or(z.bigint()),
  expiresAt: z.string().datetime().optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
}).strict() // Rejeita propriedades extras como userId

/**
 * Schema para revogar permissão individual de usuário
 */
export const revokeUserPermissionSchema = z.object({
  permissionId: z.string().or(z.number()).or(z.bigint()),
  expiresAt: z.string().datetime().optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
}).strict() // Rejeita propriedades extras como userId

/**
 * Schema para remover permissão individual de usuário completamente
 */
export const deleteUserPermissionSchema = z.object({
  permissionId: z.string().or(z.number()).or(z.bigint()),
  reason: z.string().max(500).optional().nullable(),
}).strict() // Rejeita propriedades extras como userId

/**
 * Schema para filtros de auditoria
 */
export const auditFiltersSchema = z.object({
  userId: z.string().or(z.number()).or(z.bigint()).optional().nullable(),
  roleId: z.string().or(z.number()).or(z.bigint()).optional().nullable(),
  actionType: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
})

/**
 * Schema para filtros de permissões
 */
export const permissionFiltersSchema = z.object({
  resource: z.string().optional().nullable(),
  action: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  search: z.string().optional().nullable(),
})

/**
 * Tipos inferidos dos schemas
 */
export type GrantUserPermissionInput = z.infer<typeof grantUserPermissionSchema>
export type RevokeUserPermissionInput = z.infer<typeof revokeUserPermissionSchema>
export type DeleteUserPermissionInput = z.infer<typeof deleteUserPermissionSchema>
export type AuditFiltersInput = z.infer<typeof auditFiltersSchema>
export type PermissionFiltersInput = z.infer<typeof permissionFiltersSchema>

