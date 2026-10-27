import { NextRequest, NextResponse } from 'next/server'
import { getUserBonusStats, getUserFinancialData, getPointsConversionParameters, getUserPointsDisplay, getUserActivePackages, getUserCashbackTotal } from '@/lib/business-logic'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const userIdBigInt = BigInt(userId)

    // Buscar dados básicos do usuário (sem balance/totalEarned/leftPoints/rightPoints)
    const user = await prisma.user.findUnique({
      where: { id: userIdBigInt },
      select: {
        id: true,
        name: true,
        email: true,
        sponsorId: true,
        parentId: true,
        position: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar pacotes ativos do usuário (considerando isActive e data de expiração)
    const userPackages = await getUserActivePackages(userIdBigInt)

    // Calcular balance e totalEarned dinamicamente
    const financialData = await getUserFinancialData(userIdBigInt)

    // Buscar estatísticas de bônus
    const bonusStats = await getUserBonusStats(userIdBigInt)

    // Verificar se o usuário tem pacotes elegíveis para cashback (clube300Eligible)
    const hasEligiblePackage = userPackages.some(pkg => pkg.package.clube300Eligible)

    // Buscar total de cashback se o usuário tem pacote elegível
    let cashbackTotal = 0
    if (hasEligiblePackage) {
      const cashback = await getUserCashbackTotal(userIdBigInt)
      cashbackTotal = Number(cashback)
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userIdBigInt,
        NOT: { description: { endsWith: '.' } }
      },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        description: true,
        createdAt: true,
        sourceUserId: true,
        level: true,
        sourceUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          id: Number(user.id),
          sponsorId: user.sponsorId ? Number(user.sponsorId) : null,
          parentId: user.parentId ? Number(user.parentId) : null,
          balance: Number(financialData.balance),
          totalEarned: Number(financialData.totalEarned)
        },
        packages: userPackages.map(userPackage => ({
          id: Number(userPackage.id),
          name: userPackage.package.name,
          price: Number(userPackage.package.price),
          isActive: userPackage.isActive,
          activatedAt: userPackage.activatedAt.toISOString(),
          expiresAt: userPackage.expiresAt?.toISOString() || null,
          package: {
            id: Number(userPackage.package.id),
            name: userPackage.package.name,
            description: userPackage.package.description,
            price: Number(userPackage.package.price),
            points: userPackage.package.points,
            profitSharePercent: Number(userPackage.package.profitSharePercent)
          }
        })),
        bonuses: {
          totalBonuses: Number(bonusStats.totalBonuses),
          directBonuses: Number(bonusStats.directBonuses),
          indirectBonuses: Number(bonusStats.indirectBonuses),
          activationBonuses: Number(bonusStats.activationBonuses),
          profitShares: Number(bonusStats.profitShares),
          careerBonuses: Number(bonusStats.careerBonuses),
          cashback: cashbackTotal,
          hasEligiblePackage: hasEligiblePackage,
          recentTransactions: bonusStats.recentTransactions.map((transaction: any) => ({
            id: Number(transaction.id),
            userId: Number(transaction.userId),
            packageId: transaction.packageId ? Number(transaction.packageId) : null,
            type: transaction.type,
            amount: Number(transaction.amount),
            description: transaction.description,
            createdAt: transaction.createdAt.toISOString(),
            status: transaction.status,
            sourceUserId: transaction.sourceUserId ? Number(transaction.sourceUserId) : null,
            level: transaction.level,
            sourceUser: transaction.sourceUser ? {
              id: Number(transaction.sourceUser.id),
              name: transaction.sourceUser.name,
              email: transaction.sourceUser.email
            } : null
          }))
        },
        transactions: transactions.map(transaction => ({
          id: Number(transaction.id),
          type: transaction.type,
          status: transaction.status,
          amount: Number(transaction.amount),
          description: transaction.description,
          createdAt: transaction.createdAt.toISOString(),
          sourceUserId: transaction.sourceUserId ? Number(transaction.sourceUserId) : null,
          level: transaction.level,
          sourceUser: transaction.sourceUser ? {
            id: Number(transaction.sourceUser.id),
            name: transaction.sourceUser.name,
            email: transaction.sourceUser.email
          } : null
        }))
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas de bônus:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 