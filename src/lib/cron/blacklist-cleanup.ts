import { cleanExpiredBlacklist } from '@/lib/blacklist'

/**
 * Job de limpeza de entradas expiradas da blacklist
 * Deve ser executado diariamente (recomendado: 00:00 ou 03:00)
 * 
 * Para agendar este job, use uma das opções:
 * 1. Vercel Cron: vercel.json com configuração de cron
 * 2. Node-cron: schedule('0 0 * * *', blacklistCleanupJob)
 * 3. API Route manual: /api/cron/blacklist-cleanup
 */
export async function blacklistCleanupJob() {
  try {
    console.log('[Blacklist Cleanup] Iniciando limpeza de entradas expiradas...')
    
    const startTime = Date.now()
    const result = await cleanExpiredBlacklist()
    const duration = Date.now() - startTime

    if (result.success) {
      console.log(`[Blacklist Cleanup] Concluído com sucesso em ${duration}ms`)
      console.log(`[Blacklist Cleanup] ${result.count} entradas desativadas`)
      
      return {
        success: true,
        count: result.count,
        duration
      }
    } else {
      console.error('[Blacklist Cleanup] Erro durante limpeza:', result.error)
      return {
        success: false,
        error: result.error,
        duration
      }
    }
  } catch (error) {
    console.error('[Blacklist Cleanup] Erro não capturado:', error)
    return {
      success: false,
      error: 'Erro não capturado durante limpeza'
    }
  }
}

// Exportar função configurável para diferentes schedulers
export function scheduleBlacklistCleanup(scheduler: 'vercel' | 'node-cron' | 'manual') {
  switch (scheduler) {
    case 'vercel':
      // Configurar no vercel.json:
      // {
      //   "crons": [{
      //     "path": "/api/cron/blacklist-cleanup",
      //     "schedule": "0 0 * * *"
      //   }]
      // }
      return 'Configure no vercel.json conforme documentação'
      
    case 'node-cron':
      // Para uso com node-cron:
      // const cron = require('node-cron')
      // cron.schedule('0 0 * * *', blacklistCleanupJob)
      return 'Use node-cron.schedule("0 0 * * *", blacklistCleanupJob)'
      
    case 'manual':
      // Criar rota API para trigger manual:
      // /api/cron/blacklist-cleanup
      return 'Crie rota API em /api/cron/blacklist-cleanup'
      
    default:
      throw new Error('Scheduler não suportado')
  }
}
