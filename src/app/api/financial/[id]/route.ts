import { NextRequest, NextResponse } from 'next/server'
import { FinancialService } from '@/lib/financial-service'
import { updateFinancialTransactionSchema } from '@/types/financial'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// PUT - Atualizar transação financeira
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = updateFinancialTransactionSchema.parse(body)

    const transaction = await FinancialService.updateTransaction(params.id, validatedData)

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Erro ao atualizar transação financeira:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos',
        details: error.issues 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// DELETE - Deletar transação financeira
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await FinancialService.deleteTransaction(params.id)

    return NextResponse.json({ message: 'Transação deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar transação financeira:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 