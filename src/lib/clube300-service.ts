/**
 * Serviço para gerenciamento do Clube dos 300 - por Mineradora
 * Responsável pelo processamento do Cashback Pioneiro
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { 
  getCurrentMonthBusinessDays, 
  isTodayBusinessDay, 
  calculateDailyCashback 
} from '@/lib/business-days-utils'
import { isBlacklisted } from '@/lib/blacklist'

interface CashbackProcessResult {
  success: boolean
  processedUsers: number
  totalAmount: Decimal
  errors: string[]
  details: Array<{
    userId: bigint
    userName: string
    packageName: string
    cashbackAmount: Decimal
    transactionId?: bigint
  }>
}

interface Clube300MemberData {
  id: bigint
  userId: bigint
  userPackageId: bigint
  minerId: bigint
  memberNumber: number
  cotas: number
  isActive: boolean
  createdAt: Date
  user: {
    id: bigint
    name: string
    email: string
    packages?: Array<{
      id: bigint
      package: {
        id: bigint
        name: string
        price: Decimal
        clube300Eligible: boolean
        clube300Cotas: number
        clube300CashbackPercent: Decimal
      }
    }>
  }
  userPackage: {
    id: bigint
    package: {
      id: bigint
      name: string
      price: Decimal
      clube300Eligible: boolean
      clube300Cotas: number
      clube300CashbackPercent: Decimal
    }
  }
}

/**
 * Busca todos os membros ativos do Clube dos 300, opcionalmente filtrado por mineradora
 * @param minerId ID da mineradora (opcional; sem filtro = todos)
 */
export async function getClube300Members(minerId?: bigint): Promise<Clube300MemberData[]> {
  try {
    const members = await prisma.clube300Member.findMany({
      where: {
        isActive: true,
        ...(minerId ? { minerId } : {}),
        user: {
          isActive: true
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            packages: {
              where: {
                isActive: true,
                isUnilevel: true,
                package: {
                  clube300Eligible: true
                }
              },
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    clube300Eligible: true,
                    clube300Cotas: true,
                    clube300CashbackPercent: true
                  }
                }
              },
              orderBy: {
                package: {
                  price: 'desc'
                }
              },
              take: 1
            }
          }
        },
        userPackage: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                clube300Eligible: true,
                clube300Cotas: true,
                clube300CashbackPercent: true
              }
            }
          }
        }
      },
      orderBy: {
        memberNumber: 'asc'
      }
    })

    // Atualizar membros que fizeram upgrade de pacote
    const mappedMembers = await Promise.all(
      members.map(async (member) => {
        const highestValuePackage = member.user.packages?.[0]
        
        if (highestValuePackage && highestValuePackage.id !== member.userPackageId) {
          const currentPackagePrice = member.userPackage.package.price.toNumber()
          const newPackagePrice = highestValuePackage.package.price.toNumber()
          
          if (newPackagePrice > currentPackagePrice) {
            console.log(`🔄 Upgrade detectado para usuário ${member.user.name}:`)
            console.log(`   De: ${member.userPackage.package.name} (R$ ${currentPackagePrice})`)
            console.log(`   Para: ${highestValuePackage.package.name} (R$ ${newPackagePrice})`)

            const newCotas = highestValuePackage.package.clube300Cotas

            const updatedMember = await prisma.clube300Member.update({
              where: { id: member.id },
              data: {
                userPackageId: highestValuePackage.id,
                cotas: newCotas,
                updatedAt: new Date()
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                userPackage: {
                  include: {
                    package: {
                      select: {
                        id: true,
                        name: true,
                        price: true,
                        clube300Eligible: true,
                        clube300Cotas: true,
                        clube300CashbackPercent: true
                      }
                    }
                  }
                }
              }
            })
            
            console.log(`✅ Registro atualizado no Clube dos 300`)
            return updatedMember as Clube300MemberData
          }
        }
        
        return member
      })
    )

    return mappedMembers as Clube300MemberData[]
  } catch (error) {
    console.error('Erro ao buscar membros do Clube 300:', error)
    throw new Error('Falha ao buscar membros do Clube dos 300')
  }
}

/**
 * Calcula o cashback diário para um membro específico
 */
export async function calculateMemberDailyCashback(member: Clube300MemberData): Promise<Decimal> {
  const packagePrice = member.userPackage.package.price.toNumber()
  const packageId = member.userPackage.package.id
  const cashbackPercent = Number(member.userPackage.package.clube300CashbackPercent)

  if (cashbackPercent <= 0) {
    return new Decimal(0)
  }

  const packagesCount = await prisma.userPackage.count({
    where: {
      userId: member.userId,
      packageId: packageId,
      isActive: true,
      isUnilevel: true
    }
  })

  const businessDays = getCurrentMonthBusinessDays()
  const dailyAmountPerPackage = calculateDailyCashback(packagePrice, cashbackPercent, businessDays)
  const dailyAmount = dailyAmountPerPackage * packagesCount

  return new Decimal(dailyAmount)
}

/**
 * Processa o cashback diário para membros do Clube dos 300
 * @param minerId ID da mineradora (opcional; sem filtro = todos)
 */
export async function processDailyCashback(minerId?: bigint): Promise<CashbackProcessResult> {
  const result: CashbackProcessResult = {
    success: false,
    processedUsers: 0,
    totalAmount: new Decimal(0),
    errors: [],
    details: []
  }

  try {
    if (!isTodayBusinessDay()) {
      result.errors.push('Hoje não é um dia útil - cashback não processado')
      return result
    }

    const members = await getClube300Members(minerId)
    
    if (members.length === 0) {
      result.errors.push('Nenhum membro ativo encontrado no Clube dos 300')
      return result
    }

    const label = minerId ? `mineradora ${Number(minerId)}` : 'todas as mineradoras'
    console.log(`🏆 Processando cashback para ${members.length} membros do Clube dos 300 (${label})`)

    for (const member of members) {
      try {
        const dailyCashback = await calculateMemberDailyCashback(member)
        
        if (dailyCashback.greaterThan(0)) {
          const today = new Date()
          const startOfDay = new Date(today.setHours(0, 0, 0, 0))
          const endOfDay = new Date(today.setHours(23, 59, 59, 999))
          
          const existingTransaction = await prisma.transaction.findFirst({
            where: {
              userId: member.userId,
              type: 'CASHBACK',
              createdAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          })

          if (existingTransaction) {
            console.log(`⏭️  Cashback já processado hoje para ${member.user.name}`)
            continue
          }

          const blacklistCheck = await isBlacklisted(member.userId, 'cashback', 'receive')
          if (blacklistCheck.blocked) {
            console.log(`⏭️  Cashback bloqueado (blacklist) para ${member.user.name}: ${blacklistCheck.reason}`)
            continue
          }

          const transaction = await prisma.transaction.create({
            data: {
              userId: member.userId,
              type: 'CASHBACK',
              amount: dailyCashback,
              description: `Cashback Pioneiro - Clube dos 300 - ${member.userPackage.package.name}`,
              status: 'COMPLETED',
              paidAt: new Date(),
              referenceId: `CLUBE300_${Date.now()}_${member.userId}`,
              correlationID: `CASHBACK_PIONEIRO_${new Date().toISOString().split('T')[0]}_${member.userId}`
            }
          })

          result.details.push({
            userId: member.userId,
            userName: member.user.name,
            packageName: member.userPackage.package.name,
            cashbackAmount: dailyCashback,
            transactionId: transaction.id
          })

          result.totalAmount = result.totalAmount.plus(dailyCashback)
          result.processedUsers++
          
          console.log(`✅ Cashback processado: ${member.user.name} - ${member.userPackage.package.name} - R$ ${dailyCashback.toFixed(2)}`)
        }
      } catch (error) {
        const errorMsg = `Erro ao processar cashback para ${member.user.name}: ${error}`
        console.error(errorMsg)
        result.errors.push(errorMsg)
      }
    }

    result.success = result.errors.length === 0 || result.processedUsers > 0
    
    console.log(`🎯 Processamento concluído: ${result.processedUsers} usuários, R$ ${result.totalAmount.toFixed(2)} distribuído`)
    
    return result
  } catch (error) {
    console.error('Erro geral no processamento do cashback:', error)
    result.errors.push(`Erro geral: ${error}`)
    return result
  }
}

/**
 * Adiciona um usuário ao Clube dos 300 da mineradora especificada
 * @param userId ID do usuário
 * @param packageId ID do pacote (deve ter clube300Eligible = true)
 * @param minerId ID da mineradora
 * @returns true se adicionado com sucesso
 */
export async function addUserToClube300(userId: bigint, packageId: bigint, minerId: bigint): Promise<boolean> {
  try {
    // Verificar se o pacote é elegível para o Clube dos 300
    const packageData = await prisma.package.findUnique({
      where: { id: packageId },
      select: { id: true, name: true, price: true, clube300Eligible: true, clube300Cotas: true }
    })

    if (!packageData?.clube300Eligible) {
      console.log(`ℹ️  Pacote ID ${Number(packageId)} não é elegível para o Clube dos 300`)
      return false
    }

    // Verificar se já é membro deste clube (userId + minerId)
    const existingMember = await prisma.clube300Member.findFirst({
      where: { userId, minerId }
    })

    if (existingMember) {
      return true // Já é membro desta mineradora
    }

    // Verificar se o usuário existe e buscar o user_package correspondente
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        packages: {
          where: {
            isActive: true,
            isUnilevel: true,
            packageId: packageId,
            minerId: minerId
          },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                clube300Cotas: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!user || !user.isActive) {
      return false
    }

    if (user.packages.length === 0) {
      console.log(`❌ Usuário ${userId} não possui pacote ID ${Number(packageId)} ativo na mineradora ${Number(minerId)}`)
      return false
    }

    const userPackage = user.packages[0]
    const packageName = userPackage.package.name

    // Verificar se ainda há vagas para esta mineradora (máximo 300 por mineradora)
    const currentMembersCount = await prisma.clube300Member.count({
      where: { isActive: true, minerId }
    })

    if (currentMembersCount >= 300) {
      console.log(`❌ Clube dos 300 da mineradora ${Number(minerId)} lotado: ${currentMembersCount} membros`)
      return false
    }

    const cotas = userPackage.package.clube300Cotas

    // Usar transação com retry para garantir memberNumber único por mineradora
    let result
    let retries = 0
    const maxRetries = 3

    while (retries < maxRetries) {
      try {
        result = await prisma.$transaction(async (tx) => {
          // Buscar maior memberNumber da mineradora para evitar conflitos
          const maxMember = await tx.clube300Member.findFirst({
            where: { minerId },
            orderBy: { memberNumber: 'desc' },
            select: { memberNumber: true }
          })

          const nextMemberNumber = (maxMember?.memberNumber || 0) + 1

          // Verificar novamente se há vagas dentro da transação
          const currentCount = await tx.clube300Member.count({
            where: { isActive: true, minerId }
          })

          if (currentCount >= 300) {
            throw new Error(`Clube dos 300 da mineradora ${Number(minerId)} lotado`)
          }

          const newMember = await tx.clube300Member.create({
            data: {
              userId,
              userPackageId: userPackage.id,
              minerId,
              memberNumber: nextMemberNumber,
              cotas,
              isActive: true
            }
          })

          return newMember
        })
        
        break
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('memberNumber')) {
          retries++
          if (retries >= maxRetries) {
            console.error(`❌ Falha após ${maxRetries} tentativas de adicionar ao Clube dos 300`)
            throw error
          }
          console.log(`⚠️ Conflito de memberNumber detectado, tentando novamente (${retries + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 100 * retries))
        } else {
          throw error
        }
      }
    }

    if (!result) {
      console.error(`❌ Falha ao adicionar usuário ${userId} ao Clube dos 300 após todas as tentativas`)
      return false
    }

    console.log(`🎉 Usuário ${userId} (${user.name}) adicionado ao Clube dos 300 da mineradora ${Number(minerId)} como membro #${result.memberNumber} - ${packageName} - ${cotas} cotas`)
    return true
  } catch (error) {
    console.error('Erro ao adicionar usuário ao Clube 300:', error)
    return false
  }
}

/**
 * Remove um usuário do Clube dos 300 de uma mineradora específica
 * @param userId ID do usuário
 * @param minerId ID da mineradora
 * @returns true se removido com sucesso
 */
export async function removeUserFromClube300(userId: bigint, minerId: bigint): Promise<boolean> {
  try {
    const member = await prisma.clube300Member.findFirst({
      where: { userId, minerId },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    if (!member) {
      return true // Usuário não é membro desta mineradora
    }

    await prisma.clube300Member.update({
      where: { id: member.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    console.log(`🚫 Usuário ${userId} (${member.user.name}) removido do Clube dos 300 da mineradora ${Number(minerId)} - Membro #${member.memberNumber}`)
    return true
  } catch (error) {
    console.error('Erro ao remover usuário do Clube 300:', error)
    return false
  }
}

/**
 * Processa a distribuição de lucros para o Clube dos 300
 * @param totalProfit Lucro total da empresa no período
 * @param minerId ID da mineradora (opcional; sem filtro = todos)
 */
export async function processClube300ProfitDistribution(
  totalProfit: Decimal,
  minerId?: bigint,
  executionDate: Date = new Date()
): Promise<{
  success: boolean
  membersCount: number
  totalCotas: number
  totalDistributed: Decimal
  valuePerCota: Decimal
  error?: string
  details: Array<{
    userId: bigint
    userName: string
    packageName: string
    cotas: number
    amount: Decimal
  }>
}> {
  const result = {
    success: false,
    membersCount: 0,
    totalCotas: 0,
    totalDistributed: new Decimal(0),
    valuePerCota: new Decimal(0),
    error: undefined as string | undefined,
    details: [] as Array<{
      userId: bigint
      userName: string
      packageName: string
      cotas: number
      amount: Decimal
    }>
  }

  try {
    const today = new Date()
    const label = minerId ? `mineradora ${Number(minerId)}` : 'todas as mineradoras'
    console.log(`🏆 INICIANDO distribuição de lucros para o Clube dos 300 (${label})`)
    console.log(`   Lucro total: R$ ${totalProfit}`)
    console.log(`   Data: ${today.toLocaleDateString('pt-BR')}`)

    const members = await getClube300Members(minerId)
    
    if (members.length === 0) {
      console.log(`⚠️  Nenhum membro ativo encontrado no Clube dos 300`)
      result.error = 'Nenhum membro ativo encontrado'
      return result
    }

    const totalCotas = members.reduce((sum, member) => sum + member.cotas, 0)
    result.totalCotas = totalCotas
    result.membersCount = members.length

    console.log(`📊 Membros ativos: ${members.length}`)
    console.log(`📊 Total de cotas: ${totalCotas}`)

    const profitPercent = 1.0
    const totalValueForClube = totalProfit.mul(profitPercent).div(100)
    const valuePerCota = totalValueForClube.div(totalCotas)
    
    result.valuePerCota = valuePerCota

    console.log(`💰 Valor total para o Clube: R$ ${totalValueForClube} (${profitPercent}% do lucro)`)
    console.log(`💰 Valor por cota: R$ ${valuePerCota}`)

    for (const member of members) {
      const memberAmount = valuePerCota.mul(member.cotas)
      
      const todayCheck = new Date()
      const startOfDay = new Date(todayCheck.setHours(0, 0, 0, 0))
      const endOfDay = new Date(todayCheck.setHours(23, 59, 59, 999))
      
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          userId: member.userId,
          type: 'PROFIT_SHARE',
          description: {
            contains: 'Clube dos 300'
          },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })

      if (existingTransaction) {
        console.log(`⏭️  Lucro já processado hoje para ${member.user.name}`)
        continue
      }

      const todayTransaction = new Date()
      await prisma.transaction.create({
        data: {
          userId: member.userId,
          type: 'PROFIT_SHARE',
          amount: memberAmount,
          description: `Divisão de lucros - Clube dos 300 - ${todayTransaction.toLocaleDateString('pt-BR')} - ${member.cotas} cotas`,
          status: 'COMPLETED',
          paidAt: new Date(),
          referenceId: `CLUBE300_PROFIT_${Date.now()}_${member.userId}`,
          correlationID: `CLUBE300_PROFIT_${todayTransaction.toISOString().split('T')[0]}_${member.userId}`
        }
      })

      result.details.push({
        userId: member.userId,
        userName: member.user.name,
        packageName: member.userPackage.package.name,
        cotas: member.cotas,
        amount: memberAmount
      })

      result.totalDistributed = result.totalDistributed.add(memberAmount)

      console.log(`✅ Lucro processado para ${member.user.name}: R$ ${memberAmount} (${member.cotas} cotas)`)
    }

    result.success = true

    console.log(`🎉 Distribuição de lucros do Clube dos 300 concluída:`)
    console.log(`   - Membros processados: ${result.details.length}`)
    console.log(`   - Total distribuído: R$ ${result.totalDistributed}`)
    console.log(`   - Valor por cota: R$ ${result.valuePerCota}`)

    return result

  } catch (error) {
    console.error('❌ Erro ao processar distribuição de lucros do Clube dos 300:', error)
    result.error = error instanceof Error ? error.message : 'Erro desconhecido'
    return result
  }
}

/**
 * Obtém estatísticas do Clube dos 300, opcionalmente por mineradora
 * @param minerId ID da mineradora (opcional)
 */
export async function getClube300Stats(minerId?: bigint) {
  try {
    const whereFilter = minerId ? { isActive: true, minerId } : { isActive: true }

    const totalMembers = await prisma.clube300Member.count({
      where: whereFilter
    })

    const membersWithPackages = await prisma.clube300Member.findMany({
      where: whereFilter,
      include: {
        userPackage: {
          include: {
            package: {
              select: { name: true, slug: true, clube300Cotas: true }
            }
          }
        }
      }
    })

    const nucleoMembers = membersWithPackages.filter(m => m.userPackage.package.slug === 'nucleo').length
    const tectonMembers = membersWithPackages.filter(m => m.userPackage.package.slug === 'tecton').length

    const totalCotas = await prisma.clube300Member.aggregate({
      where: whereFilter,
      _sum: {
        cotas: true
      }
    })

    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))
    
    const todayCashback = await prisma.transaction.aggregate({
      where: {
        type: 'CASHBACK',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _sum: {
        amount: true
      }
    })

    return {
      totalMembers,
      availableSlots: 300 - totalMembers,
      nucleoMembers,
      tectonMembers,
      totalCotas: totalCotas._sum.cotas || 0,
      todayTotalCashback: todayCashback._sum.amount || new Decimal(0),
      businessDaysThisMonth: getCurrentMonthBusinessDays()
    }
  } catch (error) {
    console.error('Erro ao obter estatísticas do Clube 300:', error)
    throw error
  }
}
