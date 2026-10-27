import { PrismaClient } from '../generated/prisma'
import type { Prisma } from '../generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configuração do Prisma Client com opções otimizadas para Neon/PostgreSQL remoto
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty',
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions)

// Tratamento de erros de conexão com mensagens mais amigáveis
prisma.$on('error' as never, (e: any) => {
  if (e.code === 'P1001') {
    console.error('❌ Erro de conexão com o banco de dados')
    console.error('💡 Possíveis causas:')
    console.error('   - Banco Neon pode estar pausado (verifique no dashboard)')
    console.error('   - Problema de conectividade de rede')
    console.error('   - Firewall bloqueando a conexão')
    console.error('   - Servidor Neon temporariamente indisponível')
    console.error('\n📚 Veja manual/TROUBLESHOOTING_DATABASE.md para mais detalhes')
  } else {
    console.error('Erro do Prisma:', e)
  }
})

// Função helper para executar queries com retry automático
export async function prismaWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Apenas retry em erros de conexão (P1001)
      if (error.code === 'P1001' && attempt < maxRetries) {
        console.warn(`⚠️  Tentativa ${attempt}/${maxRetries} falhou, tentando novamente em ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
        continue
      }
      
      // Para outros erros ou última tentativa, lança o erro
      throw error
    }
  }
  
  throw lastError || new Error('Operação falhou após todas as tentativas')
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 