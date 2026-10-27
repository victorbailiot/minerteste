import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/debug/bank-account-status
 * API de debug para verificar status das contas bancárias
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bankAccount: true
      }
    })

    if (!user) {
      return NextResponse.json({
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Buscar estatísticas gerais
    const totalUsers = await prisma.user.count()
    const usersWithBankAccount = await prisma.user.count({
      where: {
        bankAccount: {
          isNot: null
        }
      }
    })

    // Buscar alguns usuários para exemplo
    const sampleUsers = await prisma.user.findMany({
      include: {
        bankAccount: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      debug: {
        currentUser: {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          hasBankAccount: !!user.bankAccount,
          bankAccount: user.bankAccount ? {
            id: user.bankAccount.id.toString(),
            bankName: user.bankAccount.bankName,
            accountNumber: user.bankAccount.accountNumber,
            recipientId: user.bankAccount.recipientId,
            createdAt: user.bankAccount.createdAt
          } : null
        },
        statistics: {
          totalUsers,
          usersWithBankAccount,
          usersWithoutBankAccount: totalUsers - usersWithBankAccount,
          percentageWithAccount: ((usersWithBankAccount / totalUsers) * 100).toFixed(1)
        },
        sampleUsers: sampleUsers.map(u => ({
          id: u.id.toString(),
          name: u.name,
          email: u.email,
          hasBankAccount: !!u.bankAccount
        }))
      }
    })

  } catch (error) {
    console.error('Erro no debug de conta bancária:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
