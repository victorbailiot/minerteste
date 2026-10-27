import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { confirm } = body

    if (!confirm) {
      return NextResponse.json({
        success: false,
        error: 'Confirmação é obrigatória para limpar o banco de dados'
      }, { status: 400 })
    }

    console.log('🗑️ INICIANDO LIMPEZA COMPLETA DO BANCO DE DADOS...')

    const deletedCounts = {
      userPointsHistory: 0,
      userPackages: 0,
      userActivations: 0,
      transactions: 0,
      profitDistributions: 0,
      cycles: 0,
      withdrawals: 0,
      contracts: 0,
      financialTransactions: 0,
      pixKeys: 0,
      bankAccounts: 0,
      unilevelUsers: 0,
      unilevelBonuses: 0,
      unilevelProfitDistributions: 0,
      unilevelUserCareer: 0,
      unilevelCareerQueue: 0,
      clube300Members: 0,
      paymentVouchers: 0,
      systemLogs: 0,
      users: 0
    }

    // Executar limpeza em transação para garantir integridade
    // Aumentar timeout para 60 segundos devido ao grande volume de dados
    await prisma.$transaction(async (tx) => {
      console.log('📊 Contando registros antes da limpeza...')

      // Contar registros antes da limpeza
      const counts = await Promise.all([
        tx.userPointsHistory.count(),
        tx.userPackage.count({where: {userId: {gt: 1}}}),
        tx.userActivation.count(),
        tx.transaction.count({ 
          where: { 
            OR: [
              { userId: { not: BigInt(1) } },
              { userId: null }
            ]
          }
        }),
        tx.profitDistribution.count(),
        tx.cycle.count(),
        tx.withdrawal.count({ where: { userId: { gt: 1 } } }),
        tx.contract.count({ where: { userId: { gt: 1 } } }),
        tx.financialTransaction.count({ where: { userId: { gt: 1 } } }),
        tx.pixKey.count({ where: { userId: { gt: 1 } } }),
        tx.bankAccount.count({ where: { userId: { gt: 1 } } }),
        tx.unilevelUser.count({ where: { userId: { gt: 1 } } }),
        tx.unilevelBonus.count(),
        tx.unilevelProfitDistribution.count(),
        tx.unilevelUserCareer.count(),
        tx.unilevelCareerQueue.count(),
        tx.clube300Member.count(),
        tx.paymentVoucher.count(),
        tx.systemLog.count(),
        tx.user.count({ where: { id: { gt: 1 } } })
      ])

      console.log(`📋 Registros encontrados:`)
      console.log(`   - UserPointsHistory: ${counts[0]}`)
      console.log(`   - UserPackages: ${counts[1]}`)
      console.log(`   - UserActivations: ${counts[2]}`)
      console.log(`   - Transactions: ${counts[3]}`)
      console.log(`   - ProfitDistributions: ${counts[4]}`)
      console.log(`   - Cycles: ${counts[5]}`)
      console.log(`   - Withdrawals: ${counts[6]}`)
      console.log(`   - Contracts: ${counts[7]}`)
      console.log(`   - FinancialTransactions: ${counts[8]}`)
      console.log(`   - PixKeys: ${counts[9]}`)
      console.log(`   - BankAccounts: ${counts[10]}`)
      console.log(`   - UnilevelUsers: ${counts[11]}`)
      console.log(`   - UnilevelBonuses: ${counts[12]}`)
      console.log(`   - UnilevelProfitDistributions: ${counts[13]}`)
      console.log(`   - UnilevelUserCareer: ${counts[14]}`)
      console.log(`   - UnilevelCareerQueue: ${counts[15]}`)
      console.log(`   - Clube300Members: ${counts[16]}`)
      console.log(`   - PaymentVouchers: ${counts[17]}`)
      console.log(`   - SystemLogs: ${counts[18]}`)
      console.log(`   - Users (ID > 1): ${counts[19]}`)

      // 1. Limpar UserPointsHistory
      console.log('🗑️ Limpando histórico de pontos...')
      const deletedPoints = await tx.userPointsHistory.deleteMany({})
      deletedCounts.userPointsHistory = deletedPoints.count
      console.log(`✅ ${deletedPoints.count} registros de pontos removidos`)

      // 2. Limpar UserPackages
      console.log('🗑️ Limpando pacotes de usuários...')
      const deletedPackages = await tx.userPackage.deleteMany({where: {userId: {gt: 1}}})
      deletedCounts.userPackages = deletedPackages.count
      console.log(`✅ ${deletedPackages.count} pacotes de usuários removidos`)

      // 3. Limpar UserActivations
      console.log('🗑️ Limpando ativações de usuários...')
      const deletedActivations = await tx.userActivation.deleteMany({})
      deletedCounts.userActivations = deletedActivations.count
      console.log(`✅ ${deletedActivations.count} ativações removidas`)

      // 4. Limpar Transactions
      console.log('🗑️ Limpando transações...')
      const deletedTransactions = await tx.transaction.deleteMany({
        where: { 
          OR: [
            { userId: { not: BigInt(1) } },
            { userId: null }
          ],
          //type: { notIn: ['PIX_PAYMENT', 'PURCHASE'] }
        }
      })
      deletedCounts.transactions = deletedTransactions.count
      console.log(`✅ ${deletedTransactions.count} transações removidas`)

      // 10. Limpar BankAccounts
      console.log('🗑️ Limpando contas bancárias...')
      const deletedBankAccounts = await tx.bankAccount.deleteMany({
        where: {
          userId: { gt: 1 }
        }
      })
      deletedCounts.bankAccounts = deletedBankAccounts.count
      console.log(`✅ ${deletedBankAccounts.count} contas bancárias removidas`)

      // 11. Limpar UnilevelUsers
      console.log('🗑️ Limpando usuários unilevel...')
      const deletedUnilevelUsers = await tx.unilevelUser.deleteMany({
        where: {
          userId: { gt: 1 }
        }
      })
      deletedCounts.unilevelUsers = deletedUnilevelUsers.count
      console.log(`✅ ${deletedUnilevelUsers.count} usuários unilevel removidos`)

      // 12. Limpar UnilevelBonuses
      console.log('🗑️ Limpando bônus unilevel...')
      const deletedUnilevelBonuses = await tx.unilevelBonus.deleteMany({})
      deletedCounts.unilevelBonuses = deletedUnilevelBonuses.count
      console.log(`✅ ${deletedUnilevelBonuses.count} bônus unilevel removidos`)

      // 13. Limpar UnilevelProfitDistributions
      console.log('🗑️ Limpando distribuições de lucro unilevel...')
      const deletedUnilevelProfits = await tx.unilevelProfitDistribution.deleteMany({})
      deletedCounts.unilevelProfitDistributions = deletedUnilevelProfits.count
      console.log(`✅ ${deletedUnilevelProfits.count} distribuições de lucro unilevel removidas`)

      // 14. Limpar UnilevelUserCareer
      console.log('🗑️ Limpando histórico de carreira unilevel...')
      const deletedUnilevelCareer = await tx.unilevelUserCareer.deleteMany({})
      deletedCounts.unilevelUserCareer = deletedUnilevelCareer.count
      console.log(`✅ ${deletedUnilevelCareer.count} registros de carreira unilevel removidos`)

      // 15. Limpar UnilevelCareerQueue
      console.log('🗑️ Limpando fila de carreira unilevel...')
      const deletedCareerQueue = await tx.unilevelCareerQueue.deleteMany({})
      deletedCounts.unilevelCareerQueue = deletedCareerQueue.count
      console.log(`✅ ${deletedCareerQueue.count} registros da fila de carreira removidos`)

      // 16. Limpar Clube300Members
      console.log('🗑️ Limpando membros do Clube 300...')
      const deletedClube300 = await tx.clube300Member.deleteMany({})
      deletedCounts.clube300Members = deletedClube300.count
      console.log(`✅ ${deletedClube300.count} membros do Clube 300 removidos`)

      // 17. Limpar PaymentVouchers
      console.log('🗑️ Limpando vouchers de pagamento...')
      const deletedVouchers = await tx.paymentVoucher.deleteMany({})
      deletedCounts.paymentVouchers = deletedVouchers.count
      console.log(`✅ ${deletedVouchers.count} vouchers de pagamento removidos`)

      // 18. Limpar SystemLogs
      console.log('🗑️ Limpando logs do sistema...')
      const deletedSystemLogs = await tx.systemLog.deleteMany({})
      deletedCounts.systemLogs = deletedSystemLogs.count
      console.log(`✅ ${deletedSystemLogs.count} logs do sistema removidos`)

      // 5. Limpar ProfitDistributions
      console.log('🗑️ Limpando distribuições de lucro...')
      const deletedProfits = await tx.profitDistribution.deleteMany({})
      deletedCounts.profitDistributions = deletedProfits.count
      console.log(`✅ ${deletedProfits.count} distribuições de lucro removidas`)

      // 6. Limpar Cycles
      console.log('🗑️ Limpando ciclos...')
      const deletedCycles = await tx.cycle.deleteMany({})
      deletedCounts.cycles = deletedCycles.count
      console.log(`✅ ${deletedCycles.count} ciclos removidos`)

      // 7. Limpar Withdrawals
      console.log('🗑️ Limpando saques...')
      const deletedWithdrawals = await tx.withdrawal.deleteMany({
        where: {
          userId: { gt: 1 }
        }
      })
      deletedCounts.withdrawals = deletedWithdrawals.count
      console.log(`✅ ${deletedWithdrawals.count} saques removidos`)

      // 8. Limpar Contracts
      console.log('🗑️ Limpando contratos...')
      const deletedContracts = await tx.contract.deleteMany({
        where: {
          userId: { gt: 1 }
        }
      })
      deletedCounts.contracts = deletedContracts.count
      console.log(`✅ ${deletedContracts.count} contratos removidos`)

      // 9. Limpar FinancialTransactions
      console.log('🗑️ Limpando transações financeiras...')
      const deletedFinancialTransactions = await tx.financialTransaction.deleteMany({
        where: {
          userId: { gt: 1 }
        }
      })
      deletedCounts.financialTransactions = deletedFinancialTransactions.count
      console.log(`✅ ${deletedFinancialTransactions.count} transações financeiras removidas`)

      // 10. Limpar PixKey
      console.log('🗑️ Limpando chaves PIX...')
      const deletedPixKeys = await tx.pixKey.deleteMany({
        where: {
          userId: { gt: 1 }
        }
      })
      deletedCounts.pixKeys = deletedPixKeys.count
      console.log(`✅ ${deletedPixKeys.count} chaves PIX removidas`)

      // 19. Limpar Users (exceto ID = 1)
      console.log('🗑️ Limpando usuários (mantendo admin)...')
      const deletedUsers = await tx.user.deleteMany({
        where: {
          id: { gt: 1 }
        }
      })
      deletedCounts.users = deletedUsers.count
      console.log(`✅ ${deletedUsers.count} usuários removidos (mantido usuário ID = 1)`)

      console.log('🎉 LIMPEZA COMPLETA FINALIZADA COM SUCESSO!')
    }, { timeout: 60000, maxWait: 10000 })

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
      success: true,
      message: `Banco de dados limpo com sucesso! ${totalDeleted} registros removidos.`,
      data: {
        deletedCounts,
        totalDeleted,
        timestamp: new Date().toISOString(),
        summary: [
          `${deletedCounts.users} usuários removidos`,
          `${deletedCounts.transactions} transações removidas`,
          `${deletedCounts.userPointsHistory} pontos removidos`,
          `${deletedCounts.userPackages} pacotes removidos`,
          `${deletedCounts.userActivations} ativações removidas`,
          `${deletedCounts.cycles} ciclos removidos`,
          `${deletedCounts.profitDistributions} distribuições removidas`,
          `${deletedCounts.withdrawals} saques removidos`,
          `${deletedCounts.contracts} contratos removidos`,
          `${deletedCounts.financialTransactions} transações financeiras removidas`,
          `${deletedCounts.pixKeys} chaves PIX removidas`,
          `${deletedCounts.bankAccounts} contas bancárias removidas`,
          `${deletedCounts.unilevelUsers} usuários unilevel removidos`,
          `${deletedCounts.unilevelBonuses} bônus unilevel removidos`,
          `${deletedCounts.unilevelProfitDistributions} distribuições unilevel removidas`,
          `${deletedCounts.unilevelUserCareer} registros de carreira removidos`,
          `${deletedCounts.unilevelCareerQueue} registros da fila removidos`,
          `${deletedCounts.clube300Members} membros do Clube 300 removidos`,
          `${deletedCounts.paymentVouchers} vouchers removidos`,
          `${deletedCounts.systemLogs} logs removidos`
        ]
      }
    })

  } catch (error) {
    console.error('❌ Erro durante limpeza do banco:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor durante limpeza',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Método GET para verificar contadores atuais
export async function GET(request: NextRequest) {
  try {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { id: { gt: 1 } } }),
      prisma.transaction.count({ 
        where: { 
          OR: [
            { userId: { not: BigInt(1) } },
            { userId: null }
          ]
        }
      }),
      prisma.userPointsHistory.count(),
      prisma.userPackage.count(),
      prisma.userActivation.count(),
      prisma.cycle.count(),
      prisma.profitDistribution.count(),
      prisma.withdrawal.count({ where: { userId: { gt: 1 } } }),
      prisma.contract.count({ where: { userId: { gt: 1 } } }),
      prisma.financialTransaction.count({ where: { userId: { gt: 1 } } }),
      prisma.pixKey.count({ where: { userId: { gt: 1 } } }),
      prisma.bankAccount.count({ where: { userId: { gt: 1 } } }),
      prisma.unilevelUser.count({ where: { userId: { gt: 1 } } }),
      prisma.unilevelBonus.count(),
      prisma.unilevelProfitDistribution.count(),
      prisma.unilevelUserCareer.count(),
      prisma.unilevelCareerQueue.count(),
      prisma.clube300Member.count(),
      prisma.paymentVoucher.count(),
      prisma.systemLog.count()
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: counts[0],
        usersToDelete: counts[1],
        transactions: counts[2],
        userPointsHistory: counts[3],
        userPackages: counts[4],
        userActivations: counts[5],
        cycles: counts[6],
        profitDistributions: counts[7],
        withdrawals: counts[8],
        contracts: counts[9],
        financialTransactions: counts[10],
        pixKeys: counts[11],
        bankAccounts: counts[12],
        unilevelUsers: counts[13],
        unilevelBonuses: counts[14],
        unilevelProfitDistributions: counts[15],
        unilevelUserCareer: counts[16],
        unilevelCareerQueue: counts[17],
        clube300Members: counts[18],
        paymentVouchers: counts[19],
        systemLogs: counts[20],
        estimatedTotalRecords: counts.slice(1).reduce((sum, count) => sum + count, 0)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar contadores:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 