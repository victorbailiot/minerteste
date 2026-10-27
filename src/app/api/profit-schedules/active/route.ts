import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const minerIdParam = searchParams.get('minerId')
    if (minerIdParam && !/^\d+$/.test(minerIdParam)) {
      return NextResponse.json(
        {
          error: 'Mineradora inválida',
          message: 'O parâmetro minerId deve ser numérico'
        },
        { status: 400 }
      )
    }
    const selectedMinerId = minerIdParam ? BigInt(minerIdParam) : null

    // Buscar agendamento ativo
    const activeSchedule = await prisma.profitSchedule.findFirst({
      where: {
        isActive: true,
        ...(selectedMinerId ? { minerId: selectedMinerId } : {})
      },
      include: {
        miner: {
          select: {
            id: true,
            name: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!activeSchedule) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    const totalProfit = activeSchedule.totalProfit
    const scheduledAt = activeSchedule.scheduledAt

    // Usar a data agendada como data de execução para a projeção
    // A regra é: pacote ativo e não expirado antes da data de execução
    const executionDate = new Date(scheduledAt)

    // Buscar todos os pacotes unilevel ativos
    const packages = await prisma.package.findMany({
      where: {
        isUnilevel: true,
        isActive: true
      },
      orderBy: {
        price: 'asc'
      }
    })

    // Calcular divisão por pacote
    const divisions: Array<{
      packageId: number
      packageName: string
      profitPercent: number
      percentExtra: number
      totalProfitPercent: number
      activePackagesCount: number
      uniqueUsersCount?: number
      valuePerCota: number
      isClube300: boolean
      totalCotas?: number
    }> = []

    for (const packageData of packages) {
      // Calcular percentual total (profitSharePercent + percentExtra)
      const percentExtra = packageData.percentExtra || new Decimal(0)
      const totalProfitPercent = packageData.profitSharePercent.add(percentExtra)

      // Se o percentual total for zero, pular este pacote
      if (totalProfitPercent.isZero()) {
        continue
      }

      // Contar TOTAL DE PACOTES ativos unilevel para este package
      // IMPORTANTE: Conta registros de user_packages, não usuários
      // Se um usuário tiver múltiplos pacotes do mesmo tipo, todos serão contados
      // Regra: pacote ativo, não expirado antes da data de execução e usuário ativo (não banido)
      const activeUserPackages = await prisma.userPackage.findMany({
        where: {
          packageId: packageData.id,
          isActive: true,
          isUnilevel: true,
          ...(activeSchedule.minerId ? { minerId: activeSchedule.minerId } : {}),
          ...(activeSchedule.minerId
            ? {
                package: {
                  packageMiners: {
                    some: { minerId: activeSchedule.minerId }
                  }
                }
              }
            : {}),
          user: {
            isActive: true // Excluir pacotes de usuários banidos
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: executionDate } }
          ]
        },
        select: {
          userId: true
        }
      })

      // Se não há pacotes ativos, pular
      if (activeUserPackages.length === 0) {
        continue
      }

      // Contar usuários únicos
      const uniqueUserIds = new Set(activeUserPackages.map(up => up.userId.toString()))
      const uniqueUsersCount = uniqueUserIds.size
      const activePackagesCount = activeUserPackages.length

      // Calcular valor para divisão usando o percentual total
      const valorParaDivisao = totalProfit.mul(totalProfitPercent).div(100)

      // Dividir o valor pela quantidade de pacotes ativos
      const valorPorCota = valorParaDivisao.div(activePackagesCount)

      divisions.push({
        packageId: Number(packageData.id),
        packageName: packageData.name,
        profitPercent: Number(packageData.profitSharePercent),
        percentExtra: Number(percentExtra),
        totalProfitPercent: Number(totalProfitPercent),
        activePackagesCount,
        uniqueUsersCount,
        valuePerCota: Number(valorPorCota),
        isClube300: false
      })
    }

    // Calcular divisão do Clube dos 300
    // Buscar todos os membros ativos do Clube dos 300
    const clube300Members = await prisma.clube300Member.findMany({
      where: {
        isActive: true
      },
      select: {
        cotas: true
      }
    })

    // Somar todas as cotas
    const totalCotas = clube300Members.reduce((sum, member) => sum + member.cotas, 0)

    // Se houver membros ativos, calcular a divisão
    if (totalCotas > 0) {
      // 1% do lucro total
      const percentualClube300 = new Decimal(1)
      const valorParaDivisaoClube300 = totalProfit.mul(percentualClube300).div(100)

      // Dividir pela soma das cotas (convertendo para Decimal)
      const valorPorCotaClube300 = valorParaDivisaoClube300.div(new Decimal(totalCotas))

      divisions.push({
        packageId: 0, // ID especial para Clube dos 300
        packageName: 'Clube dos 300',
        profitPercent: 1,
        percentExtra: 0,
        totalProfitPercent: 1,
        activePackagesCount: clube300Members.length,
        valuePerCota: Number(valorPorCotaClube300),
        isClube300: true,
        totalCotas: totalCotas
      })
    }

    // Formatar resposta
    const formattedSchedule = {
      id: Number(activeSchedule.id),
      totalProfit: Number(activeSchedule.totalProfit),
      minerId: activeSchedule.minerId ? Number(activeSchedule.minerId) : null,
      miner: activeSchedule.miner
        ? {
            id: Number(activeSchedule.miner.id),
            name: activeSchedule.miner.name
          }
        : null,
      scheduledAt: activeSchedule.scheduledAt.toISOString(),
      isActive: activeSchedule.isActive,
      createdBy: activeSchedule.createdBy ? Number(activeSchedule.createdBy) : null,
      createdAt: activeSchedule.createdAt.toISOString(),
      updatedAt: activeSchedule.updatedAt.toISOString(),
      createdByUser: activeSchedule.createdByUser ? {
        id: Number(activeSchedule.createdByUser.id),
        name: activeSchedule.createdByUser.name,
        email: activeSchedule.createdByUser.email
      } : null
    }

    return NextResponse.json({
      success: true,
      data: {
        schedule: formattedSchedule,
        divisions,
        totalProfit: Number(totalProfit),
        miner: formattedSchedule.miner
      }
    })

  } catch (error) {
    console.error('Erro ao buscar agendamento ativo:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar o agendamento ativo' 
      },
      { status: 500 }
    )
  }
}

