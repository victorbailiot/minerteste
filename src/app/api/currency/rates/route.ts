/**
 * API para obter taxas de câmbio disponíveis
 * Retorna todas as moedas e suas taxas em relação ao USD
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExchangeRates, clearExchangeRatesCache, isCacheValid } from '@/lib/currency-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const baseCurrency = searchParams.get('base')?.toLowerCase() || 'usd'
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Forçar atualização se solicitado
    if (forceRefresh) {
      clearExchangeRatesCache()
    }

    // Obter taxas de câmbio
    const rates = await getExchangeRates()

    // Se base não for USD, converter todas as taxas
    let resultRates = rates
    if (baseCurrency !== 'usd' && rates[baseCurrency]) {
      const baseRate = rates[baseCurrency]
      resultRates = Object.entries(rates).reduce((acc, [currency, rate]) => {
        acc[currency] = rate / baseRate
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      data: {
        baseCurrency: baseCurrency.toUpperCase(),
        rates: resultRates,
        totalCurrencies: Object.keys(resultRates).length,
        lastUpdated: new Date().toISOString(),
        source: isCacheValid() ? 'API' : 'Fallback',
        cacheValid: isCacheValid()
      }
    })

  } catch (error) {
    console.error('Erro ao obter taxas de câmbio:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}
