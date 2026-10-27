/**
 * Cron Job para processamento diário do Cashback Pioneiro - Clube dos 300
 * Executado todos os dias úteis às 06:00 BRT
 */

import { NextRequest, NextResponse } from 'next/server'
import { processDailyCashback } from '@/lib/clube300-service'
import { isTodayBusinessDay } from '@/lib/business-days-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    const expectedToken = process.env.CRON_AUTH_TOKEN || 'cron-secret-token'
    if (token !== expectedToken) {
      return NextResponse.json({
        success: false,
        error: 'Token de autenticação inválido'
      }, { status: 401 })
    }
    
    // Verificar se é um dia útil
    if (!isTodayBusinessDay()) {
      return NextResponse.json({
        success: true,
        message: 'Hoje não é dia útil - cashback não processado',
        processedUsers: 0,
        totalAmount: 0
      })
    }

    console.log('🚀 Iniciando processamento do Cashback Pioneiro - Clube dos 300')

    // Log do início do processamento
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        category: 'CRON_JOB',
        message: 'Iniciando processamento do Cashback Pioneiro - Clube dos 300',
        details: `Data: ${new Date().toISOString()}`
      }
    })

    // Processar cashback
    const result = await processDailyCashback()

    // Log do resultado
    await prisma.systemLog.create({
      data: {
        level: result.success ? 'INFO' : 'ERROR',
        category: 'CRON_JOB',
        message: `Cashback Pioneiro processado - ${result.processedUsers} usuários`,
        details: JSON.stringify({
          processedUsers: result.processedUsers,
          totalAmount: result.totalAmount.toString(),
          errors: result.errors,
          timestamp: new Date().toISOString()
        })
      }
    })

    if (result.errors.length > 0) {
      console.warn('⚠️ Processamento concluído com erros:', result.errors)
    }

    return NextResponse.json({
      success: result.success,
      message: `Cashback processado para ${result.processedUsers} usuários`,
      processedUsers: result.processedUsers,
      totalAmount: result.totalAmount.toNumber(),
      errors: result.errors,
      details: result.details.map(detail => ({
        userId: detail.userId.toString(),
        userName: detail.userName,
        packageName: detail.packageName,
        cashbackAmount: detail.cashbackAmount.toNumber(),
        transactionId: detail.transactionId?.toString()
      }))
    })

  } catch (error) {
    console.error('❌ Erro no cron job do Clube 300:', error)

    // Log do erro
    await prisma.systemLog.create({
      data: {
        level: 'ERROR',
        category: 'CRON_JOB',
        message: 'Erro no processamento do Cashback Pioneiro',
        details: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json({
      success: false,
      message: 'Erro interno no processamento do cashback',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const body = await request.json()
    const { force, authToken } = body
    
    const expectedToken = process.env.CRON_AUTH_TOKEN || 'cron-secret-token'
    if (authToken !== expectedToken) {
      return NextResponse.json({
        success: false,
        error: 'Token de autenticação inválido'
      }, { status: 401 })
    }

    if (force !== true && !isTodayBusinessDay()) {
      return NextResponse.json({
        success: false,
        message: 'Hoje não é dia útil. Use force: true para forçar execução'
      }, { status: 400 })
    }

    console.log('🔧 Execução manual do Cashback Pioneiro - Clube dos 300')

    const result = await processDailyCashback()

    return NextResponse.json({
      success: result.success,
      message: `Execução manual - Cashback processado para ${result.processedUsers} usuários`,
      processedUsers: result.processedUsers,
      totalAmount: result.totalAmount.toNumber(),
      errors: result.errors,
      details: result.details.map(detail => ({
        userId: detail.userId.toString(),
        userName: detail.userName,
        packageName: detail.packageName,
        cashbackAmount: detail.cashbackAmount.toNumber(),
        transactionId: detail.transactionId?.toString()
      }))
    })

  } catch (error) {
    console.error('❌ Erro na execução manual do Clube 300:', error)

    return NextResponse.json({
      success: false,
      message: 'Erro interno na execução manual',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
