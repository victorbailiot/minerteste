import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    // Buscar parâmetro totalProfit da query string
    const searchParams = request.nextUrl.searchParams
    const totalProfitParam = searchParams.get('totalProfit')
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

    if (!totalProfitParam) {
      return NextResponse.json(
        { 
          error: 'Parâmetro obrigatório',
          message: 'O parâmetro totalProfit é obrigatório' 
        },
        { status: 400 }
      )
    }

    const totalProfitValue = parseFloat(totalProfitParam)

    // Validar valor
    if (isNaN(totalProfitValue) || totalProfitValue <= 0) {
      return NextResponse.json(
        { 
          error: 'Valor inválido',
          message: 'O valor do lucro deve ser um número positivo' 
        },
        { status: 400 }
      )
    }

    // Validar valor máximo
    if (totalProfitValue > 100000000) {
      return NextResponse.json(
        { 
          error: 'Valor muito alto',
          message: 'O valor máximo permitido é R$ 100.000.000,00' 
        },
        { status: 400 }
      )
    }

    const totalProfit = new Decimal(totalProfitValue)
    const selectedMinerId = minerIdParam ? BigInt(minerIdParam) : null

    let selectedMiner: { id: bigint; name: string } | null = null
    if (selectedMinerId) {
      selectedMiner = await prisma.miner.findUnique({
        where: { id: selectedMinerId },
        select: { id: true, name: true }
      })

      if (!selectedMiner) {
        return NextResponse.json(
          {
            error: 'Mineradora não encontrada',
            message: 'Selecione uma mineradora válida'
          },
          { status: 404 }
        )
      }
    }

    // Data atual como referência para verificar pacotes ativos
    const executionDate = new Date()

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
          ...(selectedMinerId ? { minerId: selectedMinerId } : {}),
          ...(selectedMinerId
            ? {
                package: {
                  packageMiners: {
                    some: { minerId: selectedMinerId }
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

    return NextResponse.json({
      success: true,
      data: {
        divisions,
        totalProfit: Number(totalProfit),
        miner: selectedMiner
          ? {
              id: Number(selectedMiner.id),
              name: selectedMiner.name
            }
          : null
      }
    })

  } catch (error) {
    console.error('Erro ao simular divisão de lucro:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível simular a divisão de lucro' 
      },
      { status: 500 }
    )
  }
}

