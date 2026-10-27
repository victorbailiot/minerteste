import { checkAndFormCycles, processMonthlyProfitDistribution, expireOldActivations, processAutoActivation } from './business-logic'
import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { SystemLogger } from '@/lib/system-logger'
import { processDailyCashback } from '@/lib/clube300-service'
import { isTodayBusinessDay } from '@/lib/business-days-utils'
import { processCareerQueue, cleanupCareerQueue } from './business-logic-unilevel'
import { processRecalcQueue } from './points-calculator'

/**
 * Executa verificação de ciclos automaticamente
 * Deve ser executado de hora em hora
 */
export async function runCycleCheck() {
  try {
    console.log('🔄 Iniciando verificação automática de ciclos...')
    
    await checkAndFormCycles()
    
    console.log('✅ Verificação de ciclos concluída com sucesso')
    
    // Log da execução
    await logCronExecution('CYCLE_CHECK', 'SUCCESS')
    
  } catch (error) {
    console.error('❌ Erro na verificação de ciclos:', error)
    await logCronExecution('CYCLE_CHECK', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
  }
}

/**
 * Executa distribuição mensal de lucros
 * Deve ser executado no primeiro dia de cada mês
 */
export async function runMonthlyProfitDistribution() {
  try {
    console.log('💰 Iniciando distribuição mensal de lucros...')
    
    // Calcular período do mês anterior
    const now = new Date()
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(firstDayOfCurrentMonth.getTime() - 1)
    
    // Verificar se já foi processado este mês
    const existingDistribution = await prisma.profitDistribution.findFirst({
      where: {
        periodStart: firstDayOfLastMonth,
        periodEnd: lastDayOfLastMonth
      }
    })
    
    if (existingDistribution) {
      console.log('ℹ️ Distribuição de lucros já foi processada para este período')
      return
    }
    
    // Simular lucro da empresa (em um cenário real, isso viria de dados reais)
    // Por enquanto, usar um valor fixo para demonstração
    const totalProfit = new Decimal(50000.00) // R$ 50.000,00
    
    await processMonthlyProfitDistribution(
      totalProfit,
      firstDayOfLastMonth,
      lastDayOfLastMonth
    )
    
    console.log('✅ Distribuição mensal de lucros concluída com sucesso')
    console.log(`📊 Período: ${firstDayOfLastMonth.toLocaleDateString()} a ${lastDayOfLastMonth.toLocaleDateString()}`)
    console.log(`💵 Lucro total distribuído: R$ ${totalProfit}`)
    
    // Log da execução
    await logCronExecution('PROFIT_DISTRIBUTION', 'SUCCESS', `Período: ${firstDayOfLastMonth.toISOString()} - ${lastDayOfLastMonth.toISOString()}`)
    
  } catch (error) {
    console.error('❌ Erro na distribuição de lucros:', error)
    await logCronExecution('PROFIT_DISTRIBUTION', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
  }
}


/**
 * Executa limpeza de dados antigos
 * Deve ser executado semanalmente
 */
export async function runDataCleanup() {
  try {
    console.log('🧹 Iniciando limpeza de dados...')
    
    // Limpar transações canceladas antigas (mais de 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: {
        status: 'CANCELLED',
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    })
    
    console.log(`🗑️ Removidas ${deletedTransactions.count} transações canceladas antigas`)
    
    // Limpar contratos expirados
    const expiredContracts = await prisma.contract.updateMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: thirtyDaysAgo
        }
      },
      data: {
        status: 'EXPIRED'
      }
    })
    
    console.log(`📄 Marcados ${expiredContracts.count} contratos como expirados`)
    
    console.log('✅ Limpeza de dados concluída')
    await logCronExecution('DATA_CLEANUP', 'SUCCESS')
    
  } catch (error) {
    console.error('❌ Erro na limpeza de dados:', error)
    await logCronExecution('DATA_CLEANUP', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
  }
}

/**
 * Executa verificação e expiração de ativações vencidas
 * Deve ser executado diariamente
 */
export async function runActivationExpiration() {
  try {
    console.log('⏰ Iniciando verificação de ativações vencidas...')
    
    await expireOldActivations()
    
    console.log('✅ Verificação de ativações concluída')
    await logCronExecution('ACTIVATION_EXPIRATION', 'SUCCESS')
    
  } catch (error) {
    console.error('❌ Erro na verificação de ativações:', error)
    await logCronExecution('ACTIVATION_EXPIRATION', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
  }
}

/**
 * Executa ativação automática para usuários elegíveis
 * Deve ser executado diariamente às 04:00
 */
export async function runAutoActivation() {
  try {
    console.log('🤖 Iniciando processamento de ativação automática...')
    
    await processAutoActivation()
    
    console.log('✅ Processamento de ativação automática concluído')
    await logCronExecution('AUTO_ACTIVATION', 'SUCCESS')
    
  } catch (error) {
    console.error('❌ Erro no processamento de ativação automática:', error)
    await logCronExecution('AUTO_ACTIVATION', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
  }
}

/**
 * Executa relatório diário de estatísticas
 * Deve ser executado diariamente às 23:59
 */
export async function runDailyReport() {
  try {
    console.log('📊 Gerando relatório diário...')
    
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)
    
    // Estatísticas do dia
    const stats = {
      newUsers: await prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      newPackages: await prisma.userPackage.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      completedCycles: await prisma.cycle.count({
        where: {
          completedAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      totalTransactions: await prisma.transaction.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: 'COMPLETED'
        }
      }),
      totalVolume: await prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: 'COMPLETED',
          type: {
            in: ['PURCHASE', 'DEPOSIT']
          }
        },
        _sum: {
          amount: true
        }
      })
    }
    
    console.log('📈 Relatório Diário:')
    console.log(`   👥 Novos usuários: ${stats.newUsers}`)
    console.log(`   📦 Pacotes adquiridos: ${stats.newPackages}`)
    console.log(`   🔄 Ciclos completados: ${stats.completedCycles}`)
    console.log(`   💳 Transações: ${stats.totalTransactions}`)
    console.log(`   💰 Volume total: R$ ${stats.totalVolume._sum.amount || 0}`)
    
    await logCronExecution('DAILY_REPORT', 'SUCCESS', JSON.stringify(stats))
    
  } catch (error) {
    console.error('❌ Erro no relatório diário:', error)
    await logCronExecution('DAILY_REPORT', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
  }
}

/**
 * Log das execuções de cron jobs
 */
async function logCronExecution(
  jobType: string,
  status: 'SUCCESS' | 'ERROR',
  details?: string
) {
  try {
    await SystemLogger.cronJob(jobType, status, details)
  } catch (error) {
    console.error('Erro ao registrar log de cron job:', error)
  }
}

/**
 * Executa processamento de cashback do Clube dos 300
 * Deve ser executado diariamente apenas em dias úteis às 06:00 BRT
 */
export async function runClube300Cashback() {
  try {
    console.log('🏆 Iniciando processamento do Cashback Pioneiro - Clube dos 300...')
    
    // Verificar se é um dia útil
    if (!isTodayBusinessDay()) {
      console.log('📅 Hoje não é dia útil - cashback não processado')
      await logCronExecution('CLUBE300_CASHBACK', 'SUCCESS', 'Não é dia útil')
      return
    }

    // Processar cashback
    const result = await processDailyCashback()

    if (result.success) {
      console.log(`✅ Cashback processado para ${result.processedUsers} usuários`)
      console.log(`💰 Valor total distribuído: R$ ${result.totalAmount.toFixed(2)}`)
      
      await logCronExecution(
        'CLUBE300_CASHBACK', 
        'SUCCESS', 
        JSON.stringify({
          processedUsers: result.processedUsers,
          totalAmount: result.totalAmount.toString(),
          details: result.details.length
        })
      )
    } else {
      console.warn('⚠️ Processamento concluído com erros:', result.errors)
      await logCronExecution('CLUBE300_CASHBACK', 'ERROR', result.errors.join('; '))
    }
    
  } catch (error) {
    console.error('❌ Erro no processamento do Clube 300:', error)
    await logCronExecution('CLUBE300_CASHBACK', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
  }
}

/**
 * Executa todas as tarefas que devem rodar diariamente
 */
export async function runDailyTasks() {
  console.log('🌅 Executando tarefas diárias...')
  
  await runCycleCheck()
  await runActivationExpiration()
  await runAutoActivation()
  await runClube300Cashback() // Adicionar cashback do Clube 300
  await runDailyReport()
  
  // No primeiro dia do mês, executar distribuição de lucros
  const today = new Date()
  if (today.getDate() === 1) {
    await runMonthlyProfitDistribution()
  }
  
  // Domingo: limpeza de dados
  if (today.getDay() === 0) {
    await runDataCleanup()
  }
  
  console.log('✅ Tarefas diárias concluídas')
}

/**
 * Processa fila de verificação de carreira em background
 * Deve ser executado a cada 30 minutos
 */
export async function runCareerQueue() {
  try {
    console.log('🔄 Iniciando processamento da fila de carreira...')
    
    const stats = await processCareerQueue(50) // Processa 50 usuários por vez
    
    console.log(`✅ Fila de carreira processada:`)
    console.log(`   - Processados: ${stats.processed}`)
    console.log(`   - Erros: ${stats.errors}`)
    console.log(`   - Restantes: ${stats.remaining}`)
    
    // Log da execução
    await logCronExecution('CAREER_QUEUE', 'SUCCESS', 
      `Processados: ${stats.processed}, Erros: ${stats.errors}, Restantes: ${stats.remaining}`)
    
    // Se houver muitos erros, registrar aviso
    if (stats.errors > 10) {
      await prisma.systemLog.create({
        data: {
          level: 'WARNING',
          category: 'CRON_JOB',
          message: `Processamento de fila de carreira com muitos erros: ${stats.errors}`,
          details: JSON.stringify(stats)
        }
      })
    }
    
    // Limpar registros antigos a cada execução
    const cleaned = await cleanupCareerQueue()
    if (cleaned > 0) {
      console.log(`🗑️  ${cleaned} registros antigos removidos da fila`)
    }
    
  } catch (error) {
    console.error('❌ Erro no processamento da fila de carreira:', error)
    await logCronExecution('CAREER_QUEUE', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
    
    await prisma.systemLog.create({
      data: {
        level: 'ERROR',
        category: 'CRON_JOB',
        message: 'Erro crítico no processamento da fila de carreira',
        details: error instanceof Error ? error.stack : 'Erro desconhecido'
      }
    })
  }
}

/**
 * Processa fila de recalculo de pontos (executado a cada 5 minutos)
 * Recalcula networkPoints de usuários marcados com flag pointsNeedsRecalc
 */
export async function runPointsRecalculation() {
  try {
    console.log('🔄 Iniciando processamento de fila de recalculo de pontos...')
    
    const startTime = Date.now()
    
    // Processar lote de 50 usuários
    const result = await processRecalcQueue(50)
    
    const duration = Date.now() - startTime
    
    console.log(`✅ Recalculo de pontos concluído em ${duration}ms`)
    console.log(`   📊 Processados: ${result.processed}`)
    console.log(`   ❌ Erros: ${result.errors}`)
    
    // Log da execução
    await logCronExecution('POINTS_RECALC', 'SUCCESS', JSON.stringify({
      processed: result.processed,
      errors: result.errors,
      duration
    }))
    
    // Criar log no sistema
    await prisma.systemLog.create({
      data: {
        level: result.errors > 0 ? 'WARNING' : 'INFO',
        category: 'CRON_JOB',
        message: `Recalculo de pontos: ${result.processed} processados, ${result.errors} erros`,
        details: JSON.stringify(result),
        metadata: {
          duration,
          batchSize: 50
        }
      }
    })
    
    // Alerta se muitos erros
    if (result.errors > 5) {
      await prisma.systemLog.create({
        data: {
          level: 'ERROR',
          category: 'CRON_JOB',
          message: `Recalculo de pontos com muitos erros: ${result.errors}`,
          details: JSON.stringify(result.details.filter(d => d.status === 'error'))
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Erro no processamento de recalculo de pontos:', error)
    await logCronExecution('POINTS_RECALC', 'ERROR', error instanceof Error ? error.message : 'Erro desconhecido')
    
    await prisma.systemLog.create({
      data: {
        level: 'ERROR',
        category: 'CRON_JOB',
        message: 'Erro crítico no recalculo de pontos',
        details: error instanceof Error ? error.stack : 'Erro desconhecido'
      }
    })
  }
}

/**
 * Função principal para ser chamada por serviços de cron
 */
export async function executeCronJob(jobType: string) {
  console.log(`🚀 Executando job: ${jobType}`)
  
  switch (jobType) {
    case 'cycles':
      await runCycleCheck()
      break
      
    case 'profit-distribution':
      await runMonthlyProfitDistribution()
      break
      
    case 'cleanup':
      await runDataCleanup()
      break
      
    case 'activation-expiration':
      await runActivationExpiration()
      break
      
    case 'auto-activation':
      await runAutoActivation()
      break
      
    case 'daily-report':
      await runDailyReport()
      break
      
    case 'daily-tasks':
      await runDailyTasks()
      break
      
      
    case 'clube300-cashback':
      await runClube300Cashback()
      break
      
    case 'career-queue':
      await runCareerQueue()
      break
      
    case 'points-recalc':
      await runPointsRecalculation()
      break
      
    default:
      console.error(`❌ Tipo de job desconhecido: ${jobType}`)
      break
  }
} 