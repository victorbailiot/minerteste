import { NextRequest, NextResponse } from 'next/server'
import { executeCronJob } from '@/lib/cron-jobs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobType, authToken } = body

    // Verificação básica de segurança (em produção, usar um token mais robusto)
    const expectedToken = process.env.CRON_AUTH_TOKEN || 'cron-secret-token'
    if (authToken !== expectedToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token de autenticação inválido' 
      }, { status: 401 })
    }

    if (!jobType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo de job é obrigatório' 
      }, { status: 400 })
    }

    const validJobs = ['cycles', 'profit-distribution', 'cleanup', 'daily-report', 'daily-tasks', 'auto-activation', 'clube300-cashback', 'career-queue', 'points-recalc']
    if (!validJobs.includes(jobType)) {
      return NextResponse.json({ 
        success: false, 
        error: `Tipo de job inválido. Tipos válidos: ${validJobs.join(', ')}` 
      }, { status: 400 })
    }

    // Executar o job
    await executeCronJob(jobType)

    return NextResponse.json({ 
      success: true, 
      message: `Job '${jobType}' executado com sucesso`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao executar cron job:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Para permitir execução via GET também (útil para testes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobType = searchParams.get('job')
    
    // Verificação de segurança - Aceita tanto token via query param quanto via Authorization header
    const queryToken = searchParams.get('token')
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.replace('Bearer ', '')
    
    const expectedToken = process.env.CRON_AUTH_TOKEN || 'cron-secret-token'
    
    // Verifica se o token veio via query param (para testes manuais) ou via header (cron da Vercel)
    const providedToken = queryToken || headerToken
    
    if (providedToken !== expectedToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token de autenticação inválido',
        debug: {
          hasQueryToken: !!queryToken,
          hasHeaderToken: !!headerToken,
          authHeader: authHeader
        }
      }, { status: 401 })
    }

    if (!jobType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Parâmetro "job" é obrigatório',
        validJobs: ['cycles', 'profit-distribution', 'cleanup', 'daily-report', 'daily-tasks', 'binary-bonus', 'auto-activation', 'clube300-cashback', 'career-queue']
      }, { status: 400 })
    }

    const validJobs = ['cycles', 'profit-distribution', 'cleanup', 'daily-report', 'daily-tasks', 'auto-activation', 'clube300-cashback', 'career-queue']
    if (!validJobs.includes(jobType)) {
      return NextResponse.json({ 
        success: false, 
        error: `Tipo de job inválido. Tipos válidos: ${validJobs.join(', ')}` 
      }, { status: 400 })
    }

    // Executar o job
    await executeCronJob(jobType)

    return NextResponse.json({ 
      success: true, 
      message: `Job '${jobType}' executado com sucesso`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao executar cron job:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 