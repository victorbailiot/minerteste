/**
 * Enum com todas as chaves de parâmetros utilizadas no sistema
 * Centraliza todas as chaves para evitar erros de digitação e facilitar manutenção
 */
export enum ParameterKeys {
  // Comissões
  DIRECT_COMMISSION_PERCENTAGE = 'direct_commission_percentage',
  INDIRECT_COMMISSION_LEVEL_1 = 'indirect_commission_level_1',
  INDIRECT_COMMISSION_LEVEL_2 = 'indirect_commission_level_2',
  COMMISSION_LEVELS_CONFIG = 'commission_levels_config',

  // Ciclos
  CYCLE_POINTS_MAJOR_LEG = 'cycle_points_major_leg',
  CYCLE_POINTS_MINOR_LEG = 'cycle_points_minor_leg',
  BONUS_CYCLE_ENABLED = 'bonus_cycle_enabled',
  CYCLE_BONUS_AMOUNT = 'cycle_bonus_amount',
  MAX_CYCLES_PER_PACKAGE = 'max_cycles_per_package',

  // Ativação
  USER_ACTIVATION_MIN_POINTS_PERCENTAGE = 'user_activation_min_points_percentage',
  ACTIVATION_PIX_AMOUNT = 'activation_pix_amount',
  ACTIVATION_BONUS_CONVERSION_PERCENT = 'activation_bonus_conversion_percent',
  ACTIVATION_DURATION_DAYS = 'activation_duration_days',
  ACTIVATION_ENABLED = 'activation_enabled',
  MONTHLY_ACTIVATION_ENABLED = 'monthly_activation_enabled',

  // Pacotes e Multiplicadores
  PACKAGE_MULTIPLIERS = 'package_multipliers',

  // Distribuição de Lucros
  PROFIT_DISTRIBUTION_ENABLED = 'profit_distribution_enabled',

  // Saques
  WITHDRAWAL_MIN_AMOUNT = 'withdrawal_min_amount',
  WITHDRAWAL_FEE_PERCENTAGE = 'withdrawal_fee_percentage',


  // Conversões
  VALUE_TO_POINT_CONVERSION = 'value_to_point_conversion',

  // Sistema Unilevel
  UNILEVEL_INDIRECT_LEVEL_2_PERCENT = 'unilevel_indirect_level_2_percent',
  UNILEVEL_INDIRECT_LEVEL_3_PERCENT = 'unilevel_indirect_level_3_percent',
  UNILEVEL_INDIRECT_LEVEL_4_PERCENT = 'unilevel_indirect_level_4_percent',
  UNILEVEL_INDIRECT_LEVEL_5_PERCENT = 'unilevel_indirect_level_5_percent',
  UNILEVEL_INDIRECT_LEVEL_6_PERCENT = 'unilevel_indirect_level_6_percent',
  UNILEVEL_INDIRECT_LEVEL_7_PERCENT = 'unilevel_indirect_level_7_percent',
  UNILEVEL_INDIRECT_LEVEL_8_PERCENT = 'unilevel_indirect_level_8_percent',
  UNILEVEL_MAX_INDIRECT_LEVELS = 'unilevel_max_indirect_levels',
  UNILEVEL_DIRECT_BONUS_ENABLED = 'unilevel_direct_bonus_enabled',
  UNILEVEL_INDIRECT_BONUS_ENABLED = 'unilevel_indirect_bonus_enabled',
  UNILEVEL_REACTIVATION_BONUS_ENABLED = 'unilevel_reactivation_bonus_enabled',
  UNILEVEL_CAREER_PROGRESSION_ENABLED = 'unilevel_career_progression_enabled',
  UNILEVEL_PROFIT_DISTRIBUTION_ENABLED = 'unilevel_profit_distribution_enabled',
  UNILEVEL_TRAVEL_BONUS_ENABLED = 'unilevel_travel_bonus_enabled',
  // Indicação Turbinada
  BOOTED_BONUS = 'booted_bonus',
}

/**
 * Constante com todas as chaves de parâmetros em formato de array
 * Útil para validações e iterações
 */
export const ALL_PARAMETER_KEYS = Object.values(ParameterKeys)

/**
 * Grupos de parâmetros por funcionalidade
 */
export const ParameterGroups = {
  COMMISSION: [
    ParameterKeys.DIRECT_COMMISSION_PERCENTAGE,
    ParameterKeys.INDIRECT_COMMISSION_LEVEL_1,
    ParameterKeys.INDIRECT_COMMISSION_LEVEL_2,
    ParameterKeys.COMMISSION_LEVELS_CONFIG,
  ],
  CYCLE: [
    ParameterKeys.CYCLE_POINTS_MAJOR_LEG,
    ParameterKeys.CYCLE_POINTS_MINOR_LEG,
    ParameterKeys.BONUS_CYCLE_ENABLED,
    ParameterKeys.CYCLE_BONUS_AMOUNT,
    ParameterKeys.MAX_CYCLES_PER_PACKAGE,
  ],
  ACTIVATION: [
    ParameterKeys.USER_ACTIVATION_MIN_POINTS_PERCENTAGE,
    ParameterKeys.ACTIVATION_PIX_AMOUNT,
    ParameterKeys.ACTIVATION_BONUS_CONVERSION_PERCENT,
    ParameterKeys.ACTIVATION_DURATION_DAYS,
    ParameterKeys.ACTIVATION_ENABLED,
    ParameterKeys.MONTHLY_ACTIVATION_ENABLED,
  ],
  FINANCIAL: [
    ParameterKeys.WITHDRAWAL_MIN_AMOUNT,
    ParameterKeys.WITHDRAWAL_FEE_PERCENTAGE,
    ParameterKeys.PROFIT_DISTRIBUTION_ENABLED,
  ],
  PACKAGES: [
    ParameterKeys.PACKAGE_MULTIPLIERS,
  ],
  CONVERSION: [
    ParameterKeys.VALUE_TO_POINT_CONVERSION,
  ],
  UNILEVEL: [
    ParameterKeys.UNILEVEL_INDIRECT_LEVEL_2_PERCENT,
    ParameterKeys.UNILEVEL_INDIRECT_LEVEL_3_PERCENT,
    ParameterKeys.UNILEVEL_INDIRECT_LEVEL_4_PERCENT,
    ParameterKeys.UNILEVEL_INDIRECT_LEVEL_5_PERCENT,
    ParameterKeys.UNILEVEL_INDIRECT_LEVEL_6_PERCENT,
    ParameterKeys.UNILEVEL_INDIRECT_LEVEL_7_PERCENT,
    ParameterKeys.UNILEVEL_INDIRECT_LEVEL_8_PERCENT,
    ParameterKeys.UNILEVEL_MAX_INDIRECT_LEVELS,
    ParameterKeys.UNILEVEL_DIRECT_BONUS_ENABLED,
    ParameterKeys.UNILEVEL_INDIRECT_BONUS_ENABLED,
    ParameterKeys.UNILEVEL_REACTIVATION_BONUS_ENABLED,
    ParameterKeys.UNILEVEL_CAREER_PROGRESSION_ENABLED,
    ParameterKeys.UNILEVEL_PROFIT_DISTRIBUTION_ENABLED,
    ParameterKeys.UNILEVEL_TRAVEL_BONUS_ENABLED,
  ],
} as const

/**
 * Tipo para garantir que apenas chaves válidas sejam usadas
 */
export type ParameterKey = `${ParameterKeys}` 