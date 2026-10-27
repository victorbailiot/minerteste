/**
 * API Route para Sincronização com Stripe
 * Sincroniza produtos e preços dos pacotes com o Stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncPackagesWithStripe } from '@/lib/stripe/stripe-integration'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/stripe/sync
 * Sincronizar pacotes com Stripe
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronização com Stripe')

    // 1. Verificar permissões (apenas admin)
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      )
    }

    // 2. Executar sincronização
    const result = await syncPackagesWithStripe()

    console.log(`✅ Sincronização concluída: ${result.synced} pacotes sincronizados`)

    if (result.errors.length > 0) {
      console.warn('⚠️ Erros durante sincronização:', result.errors)
    }

    // 3. Retornar resultado
    return NextResponse.json({
      success: result.success,
      data: {
        synced: result.synced,
        errors: result.errors,
        totalErrors: result.errors.length
      }
    })

  } catch (error) {
    console.error('❌ Erro ao sincronizar com Stripe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/sync
 * Verificar status da sincronização
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verificar permissões
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    // 2. Buscar pacotes e verificar sincronização
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      }
    })

    const syncStatus = packages.map(pkg => ({
      id: pkg.id.toString(),
      name: pkg.name,
      hasStripeProduct: false, // Por enquanto, sempre false
      hasStripePrices: false,  // Por enquanto, sempre false
      stripeProductId: null,
      stripePrices: {}
    }))

    const summary = {
      total: packages.length,
      synced: syncStatus.filter(p => p.hasStripeProduct && p.hasStripePrices).length,
      partiallySynced: syncStatus.filter(p => p.hasStripeProduct && !p.hasStripePrices).length,
      notSynced: syncStatus.filter(p => !p.hasStripeProduct).length
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        packages: syncStatus
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status da sincronização:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
