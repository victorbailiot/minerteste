/**
 * Constantes reutilizáveis para tipos de transações
 * Este arquivo centraliza todos os tipos de transações do sistema
 * para evitar inconsistências e facilitar manutenção
 */

import { TransactionType } from "@/generated/prisma"

/**
 * Tipos de transações que representam BÔNUS (ganhos/rendimentos)
 * Usado para calcular totalEarned e estatísticas de ganhos
 * NOTA: REACTIVATION_BONUS e TRAVEL_BONUS estão no enum UnilevelBonusType, não em TransactionType
 */
export const BONUS_TRANSACTION_TYPES = [
  TransactionType.DIRECT_BONUS,
  TransactionType.INDIRECT_BONUS,
  TransactionType.PROFIT_SHARE,
  TransactionType.ACTIVATION_BONUS,
  TransactionType.CASHBACK,
  TransactionType.CAREER_BONUS,
  TransactionType.CAREER_PRIZE
] as const

/**
 * Tipos de transações que representam ENTRADAS (depósitos)
 */
export const INCOME_TRANSACTION_TYPES = [
  TransactionType.DEPOSIT,
  TransactionType.PIX_PAYMENT,
  TransactionType.CREDIT_PAYMENT,
  TransactionType.SOLIDARITY_PAYMENT
] as const

/**
 * Tipos de transações que representam SAQUES
 */
export const WITHDRAWAL_TRANSACTION_TYPES = [
  TransactionType.WITHDRAWAL,
  TransactionType.BONUS_PAYMENT,
  TransactionType.SOLIDARITY_PAYMENT
] as const

/**
 * Tipos de transações que representam SAÍDAS (gastos)
 */
export const EXPENSE_TRANSACTION_TYPES = [
  TransactionType.WITHDRAWAL,
  TransactionType.PURCHASE,
  TransactionType.ACTIVATION_PIX,
  TransactionType.BONUS_PAYMENT,
  TransactionType.SOLIDARITY_PAYMENT
] as const

/**
 * Tipos de transações genéricas
 */
export const OTHER_TRANSACTION_TYPES = [
  TransactionType.BONUS // Tipo genérico de bônus
] as const

/**
 * TODOS os tipos de transações do sistema
 */
export const ALL_TRANSACTION_TYPES = [
  ...INCOME_TRANSACTION_TYPES,
  ...BONUS_TRANSACTION_TYPES,
  ...EXPENSE_TRANSACTION_TYPES,
  ...OTHER_TRANSACTION_TYPES
] as const

/**
 * Tipos de bônus relacionados ao sistema BINÁRIO (antigo)
 */
export const BINARY_BONUS_TYPES = [
  TransactionType.BINARY_BONUS
] as const

/**
 * Tipos de bônus relacionados ao sistema UNILEVEL
 * Estes são do enum TransactionType
 */
export const UNILEVEL_BONUS_TYPES = [
  TransactionType.DIRECT_BONUS,
  TransactionType.INDIRECT_BONUS,
  TransactionType.CAREER_BONUS
] as const

/**
 * Tipos de bônus do enum UnilevelBonusType
 * Usados na tabela UnilevelProfitDistribution
 */
export const UNILEVEL_BONUS_TYPE_ENUM = [
  TransactionType.DIRECT_BONUS,
  TransactionType.INDIRECT_BONUS,
  TransactionType.ACTIVATION_BONUS,
  TransactionType.PROFIT_SHARE,
  TransactionType.CAREER_BONUS
] as const

/**
 * Tipos de bônus COMPARTILHADOS entre ambos os sistemas
 */
export const SHARED_BONUS_TYPES = [
  TransactionType.PROFIT_SHARE,
  TransactionType.ACTIVATION_BONUS,
  TransactionType.CASHBACK
] as const

/**
 * Tipos de bônus de INDICAÇÃO (direto e indireto)
 * Útil para verificar bônus relacionados a indicações
 */
export const REFERRAL_BONUS_TYPES = [
  TransactionType.DIRECT_BONUS,
  TransactionType.INDIRECT_BONUS
] as const

/**
 * Tipos de bônus direto e indireto básicos (sem boost)
 * Útil para verificações de bônus de rede simples
 */
export const DIRECT_INDIRECT_BONUS_TYPES = [
  TransactionType.DIRECT_BONUS,
  TransactionType.INDIRECT_BONUS
] as const

/**
 * Type helper para garantir type safety
 */
export type BonusTransactionType = typeof BONUS_TRANSACTION_TYPES[number]
export type IncomeTransactionType = typeof INCOME_TRANSACTION_TYPES[number]
export type ExpenseTransactionType = typeof EXPENSE_TRANSACTION_TYPES[number]
export type TransactionTypeConst = typeof ALL_TRANSACTION_TYPES[number]

