import { prisma } from './prisma'
import { ParameterKeys } from '../types/parameter-keys'

export interface ParameterValue {
  id: string
  key: string
  value: string
  type: 'PERCENTUAL' | 'INTEIRO' | 'BOOLEANO' | 'JSON'
  description: string
  status: 'ATIVO' | 'INATIVO'
  createdAt: Date
  updatedAt: Date
}

export class ParameterService {
  /**
   * Busca um parâmetro específico por chave
   */
  static async getParameter(key: string): Promise<ParameterValue | null> {
    try {
      const parameter = await prisma.parameter.findUnique({
        where: { key }
      })
      
      return parameter ? {
        id: parameter.id.toString(),
        key: parameter.key,
        value: parameter.value,
        type: parameter.type as any,
        description: parameter.description,
        status: parameter.status as any,
        createdAt: parameter.createdAt,
        updatedAt: parameter.updatedAt
      } : null
    } catch (error) {
      console.error(`Erro ao buscar parâmetro ${key}:`, error)
      return null
    }
  }

  /**
   * Busca múltiplos parâmetros ativos
   */
  static async getActiveParameters(): Promise<Record<string, string>> {
    try {
      const parameters = await prisma.parameter.findMany({
        where: { status: 'ATIVO' }
      })
      
      return Object.fromEntries(
        parameters.map(p => [p.key, p.value])
      )
    } catch (error) {
      console.error('Erro ao buscar parâmetros ativos:', error)
      return {}
    }
  }

  /**
   * Busca um parâmetro e converte para número (percentual ou inteiro)
   */
  static async getNumericParameter(key: string): Promise<number | null> {
    try {
      const parameter = await this.getParameter(key)
      if (!parameter) return null
      
      const value = parseFloat(parameter.value)
      return isNaN(value) ? null : value
    } catch (error) {
      console.error(`Erro ao buscar parâmetro numérico ${key}:`, error)
      return null
    }
  }

  /**
   * Busca um parâmetro e converte para booleano
   */
  static async getBooleanParameter(key: string): Promise<boolean | null> {
    try {
      const parameter = await this.getParameter(key)
      if (!parameter) return null
      
      return parameter.value === 'true'
    } catch (error) {
      console.error(`Erro ao buscar parâmetro booleano ${key}:`, error)
      return null
    }
  }

  /**
   * Busca um parâmetro e parseia como JSON
   */
  static async getJsonParameter<T = any>(key: string): Promise<T | null> {
    try {
      const parameter = await this.getParameter(key)
      if (!parameter) return null
      
      return JSON.parse(parameter.value) as T
    } catch (error) {
      console.error(`Erro ao buscar parâmetro JSON ${key}:`, error)
      return null
    }
  }

  /**
   * Busca um parâmetro percentual e retorna o valor em decimal
   */
  static async getPercentageParameter(key: string): Promise<number | null> {
    try {
      const value = await this.getNumericParameter(key)
      return value !== null ? value / 100 : null
    } catch (error) {
      console.error(`Erro ao buscar parâmetro percentual ${key}:`, error)
      return null
    }
  }

  /**
   * Verifica se um parâmetro está ativo
   */
  static async isParameterActive(key: string): Promise<boolean> {
    try {
      const parameter = await this.getParameter(key)
      return parameter?.status === 'ATIVO'
    } catch (error) {
      console.error(`Erro ao verificar status do parâmetro ${key}:`, error)
      return false
    }
  }

  /**
   * Busca parâmetros de comissão
   */
  static async getCommissionParameters(): Promise<{
    directCommission: number
    indirectLevel1: number
    indirectLevel2: number
    levelsConfig: any
  }> {
    try {
      const [directCommission, indirectLevel1, indirectLevel2, levelsConfig] = await Promise.all([
        this.getNumericParameter(ParameterKeys.DIRECT_COMMISSION_PERCENTAGE),
                  this.getNumericParameter(ParameterKeys.INDIRECT_COMMISSION_LEVEL_1),
          this.getNumericParameter(ParameterKeys.INDIRECT_COMMISSION_LEVEL_2),
                  this.getJsonParameter(ParameterKeys.COMMISSION_LEVELS_CONFIG)
      ])

      return {
        directCommission: directCommission || 0,
        indirectLevel1: indirectLevel1 || 0,
        indirectLevel2: indirectLevel2 || 0,
        levelsConfig: levelsConfig || {}
      }
    } catch (error) {
      console.error('Erro ao buscar parâmetros de comissão:', error)
      return {
        directCommission: 0,
        indirectLevel1: 0,
        indirectLevel2: 0,
        levelsConfig: {}
      }
    }
  }

  /**
   * Busca parâmetros de ciclo
   */
  static async getCycleParameters(): Promise<{
    majorLegPoints: number
    minorLegPoints: number
    bonusEnabled: boolean
  }> {
    try {
      const [majorLegPoints, minorLegPoints, bonusEnabled] = await Promise.all([
        this.getNumericParameter('cycle_points_major_leg'),
        this.getNumericParameter('cycle_points_minor_leg'),
        this.getBooleanParameter('bonus_cycle_enabled')
      ])

      return {
        majorLegPoints: majorLegPoints || 1000,
        minorLegPoints: minorLegPoints || 500,
        bonusEnabled: bonusEnabled || false
      }
    } catch (error) {
      console.error('Erro ao buscar parâmetros de ciclo:', error)
      return {
        majorLegPoints: 1000,
        minorLegPoints: 500,
        bonusEnabled: false
      }
    }
  }

  /**
   * @deprecated
   * Busca parâmetros de pacotes
   */
  static async getPackageParameters(): Promise<{
    multipliers: any
    profitDistributionEnabled: boolean
  }> {
    try {
      const [multipliers, profitDistributionEnabled] = await Promise.all([
        this.getJsonParameter('package_multipliers'),
        this.getBooleanParameter('profit_distribution_enabled')
      ])

      return {
        multipliers: multipliers || {},
        profitDistributionEnabled: profitDistributionEnabled || false
      }
    } catch (error) {
      console.error('Erro ao buscar parâmetros de pacotes:', error)
      return {
        multipliers: {},
        profitDistributionEnabled: false
      }
    }
  }

  /**
   * Calcula comissão baseada nos parâmetros
   */
  static async calculateCommission(
    packagePrice: number,
    level: 'direct' | 'indirect_1' | 'indirect_2' = 'direct'
  ): Promise<number> {
    try {
      let percentage = 0
      
      switch (level) {
        case 'direct':
          percentage = await this.getNumericParameter(ParameterKeys.DIRECT_COMMISSION_PERCENTAGE) || 0
          break
        case 'indirect_1':
                      percentage = await this.getNumericParameter(ParameterKeys.INDIRECT_COMMISSION_LEVEL_1) || 0
            break
          case 'indirect_2':
            percentage = await this.getNumericParameter(ParameterKeys.INDIRECT_COMMISSION_LEVEL_2) || 0
          break
      }

      return (packagePrice * percentage) / 100
    } catch (error) {
      console.error('Erro ao calcular comissão:', error)
      return 0
    }
  }

  /**
   * Verifica se pode formar ciclo
   */
  static async canFormCycle(leftPoints: number, rightPoints: number): Promise<boolean> {
    try {
      const { majorLegPoints, minorLegPoints } = await this.getCycleParameters()
      
      return (leftPoints >= majorLegPoints && rightPoints >= minorLegPoints) ||
             (rightPoints >= majorLegPoints && leftPoints >= minorLegPoints)
    } catch (error) {
      console.error('Erro ao verificar formação de ciclo:', error)
      return false
    }
  }

  /**
   * Cache simples para parâmetros (5 minutos)
   */
  private static cache: Map<string, { value: any, timestamp: number }> = new Map()
  private static CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  /**
   * Busca parâmetro com cache
   */
  static async getCachedParameter(key: string): Promise<ParameterValue | null> {
    const cached = this.cache.get(key)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.value
    }
    
    const parameter = await this.getParameter(key)
    this.cache.set(key, { value: parameter, timestamp: now })
    
    return parameter
  }

  /**
   * Limpa cache
   */
  static clearCache(): void {
    this.cache.clear()
  }
} 