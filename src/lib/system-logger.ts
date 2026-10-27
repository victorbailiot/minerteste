import { PrismaClient } from '@/generated/prisma'
import { LogLevel, LogCategory } from '@/generated/prisma'

const prisma = new PrismaClient()

export class SystemLogger {
  static async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: string,
    metadata?: Record<string, any>
  ) {
    try {
      await prisma.systemLog.create({
        data: {
          level,
          category,
          message,
          details,
          metadata: metadata || undefined
        }
      })
    } catch (error) {
      console.error('Erro ao registrar log do sistema:', error)
    }
  }

  static async debug(category: LogCategory, message: string, details?: string, metadata?: Record<string, any>) {
    return this.log('DEBUG', category, message, details, metadata)
  }

  static async info(category: LogCategory, message: string, details?: string, metadata?: Record<string, any>) {
    return this.log('INFO', category, message, details, metadata)
  }

  static async warning(category: LogCategory, message: string, details?: string, metadata?: Record<string, any>) {
    return this.log('WARNING', category, message, details, metadata)
  }

  static async error(category: LogCategory, message: string, details?: string, metadata?: Record<string, any>) {
    return this.log('ERROR', category, message, details, metadata)
  }

  static async critical(category: LogCategory, message: string, details?: string, metadata?: Record<string, any>) {
    return this.log('CRITICAL', category, message, details, metadata)
  }

  // Métodos específicos para cron jobs
  static async cronJob(jobType: string, status: 'SUCCESS' | 'ERROR', details?: string, metadata?: Record<string, any>) {
    return this.log(
      status === 'SUCCESS' ? 'INFO' : 'ERROR',
      'CRON_JOB',
      `Cron job '${jobType}' executado`,
      details,
      { jobType, status, ...metadata }
    )
  }

  // Métodos específicos para eventos de sistema
  static async systemEvent(event: string, details?: string, metadata?: Record<string, any>) {
    return this.log('INFO', 'SYSTEM_EVENT', event, details, metadata)
  }

  // Métodos específicos para segurança
  static async security(event: string, details?: string, metadata?: Record<string, any>) {
    return this.log('WARNING', 'SECURITY', event, details, metadata)
  }

  // Métodos específicos para performance
  static async performance(operation: string, duration: number, details?: string, metadata?: Record<string, any>) {
    const level = duration > 5000 ? 'WARNING' : 'INFO'
    return this.log(
      level as LogLevel,
      'PERFORMANCE',
      `Operação '${operation}' executada em ${duration}ms`,
      details,
      { operation, duration, ...metadata }
    )
  }

  // Métodos específicos para lógica de negócio
  static async businessLogic(operation: string, details?: string, metadata?: Record<string, any>) {
    return this.log('INFO', 'BUSINESS_LOGIC', operation, details, metadata)
  }

  // Métodos específicos para integrações
  static async integration(service: string, operation: string, status: 'SUCCESS' | 'ERROR', details?: string, metadata?: Record<string, any>) {
    return this.log(
      status === 'SUCCESS' ? 'INFO' : 'ERROR',
      'INTEGRATION',
      `Integração com ${service}: ${operation}`,
      details,
      { service, operation, status, ...metadata }
    )
  }

  // Métodos específicos para banco de dados
  static async database(operation: string, details?: string, metadata?: Record<string, any>) {
    return this.log('INFO', 'DATABASE', operation, details, metadata)
  }
} 