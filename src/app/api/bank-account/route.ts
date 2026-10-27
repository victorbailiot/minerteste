import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

    // Conta ativa (não marcada como excluída pelo usuário)
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { userId, excludedAt: null }
    })

    if (!bankAccount) {
      return NextResponse.json({ bankAccount: null })
    }

    // Retornar dados da conta bancária
    return NextResponse.json({
      bankAccount: {
        id: bankAccount.id.toString(),
        recipientId: bankAccount.recipientId,
        recipientName: bankAccount.recipientName,
        recipientEmail: bankAccount.recipientEmail,
        recipientDocument: bankAccount.recipientDocument,
        recipientType: bankAccount.recipientType,
        recipientStatus: bankAccount.recipientStatus,
        bankCode: bankAccount.bankCode,
        bankName: bankAccount.bankName,
        branchNumber: bankAccount.branchNumber,
        branchCheckDigit: bankAccount.branchCheckDigit,
        accountNumber: bankAccount.accountNumber,
        accountCheckDigit: bankAccount.accountCheckDigit,
        accountType: bankAccount.accountType,
        holderName: bankAccount.holderName,
        holderType: bankAccount.holderType,
        holderDocument: bankAccount.holderDocument,
        transferEnabled: bankAccount.transferEnabled,
        transferInterval: bankAccount.transferInterval,
        transferDay: bankAccount.transferDay,
        anticipationEnabled: bankAccount.anticipationEnabled,
        anticipationType: bankAccount.anticipationType,
        anticipationVolumePercentage: bankAccount.anticipationVolumePercentage,
        anticipationDelay: bankAccount.anticipationDelay,
        createdAt: bankAccount.createdAt.toISOString(),
        updatedAt: bankAccount.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Erro ao buscar conta bancária:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/** Marca a conta bancária como excluída pelo usuário (soft delete; registro permanece no banco). */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    const existing = await prisma.bankAccount.findFirst({
      where: { userId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Nenhuma conta bancária encontrada' },
        { status: 404 }
      )
    }

    if (existing.excludedAt) {
      return NextResponse.json({ message: 'Conta já estava removida do perfil' })
    }

    await prisma.bankAccount.update({
      where: { userId },
      data: { excludedAt: new Date() }
    })

    return NextResponse.json({
      message: 'Dados bancários removidos do seu perfil. O histórico foi mantido nos registros do sistema.'
    })
  } catch (error) {
    console.error('Erro ao excluir conta bancária do perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}