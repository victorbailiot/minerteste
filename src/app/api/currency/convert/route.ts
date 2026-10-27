/**
 * API de Conversão de Moeda
 * Converte valores entre diferentes moedas usando taxas de câmbio
 */

import { NextRequest, NextResponse } from 'next/server'
import { convertCurrency } from '@/lib/currency-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const packageId = searchParams.get('packageId')
    const toCurrency = searchParams.get('to')?.toLowerCase()

    // Validações
    if (!packageId || !toCurrency) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros obrigatórios: packageId, to'
      }, { status: 400 })
    }

    // Buscar o pacote na tabela UnilevelPackage
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) },
      select: { price: true, name: true }
    })

    if (!packageData) {
      return NextResponse.json({
        success: false,
        error: 'Pacote não encontrado'
      }, { status: 404 })
    }

    const amount = Number(packageData.price)
    const fromCurrency = 'brl' // Fixo como BRL

    // Validar valor
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({
        success: false,
        error: 'Valor do pacote inválido'
      }, { status: 400 })
    }

    // Usar função centralizada de conversão
    const result = await convertCurrency(amount, fromCurrency, toCurrency)

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        packageName: packageData.name,
        packageId: packageId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Erro na conversão de moeda:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}
