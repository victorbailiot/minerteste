/**
 * Hook para Conversão de Moeda
 * Gerencia conversões entre diferentes moedas
 */

import { useState, useEffect, useCallback } from 'react'

interface CurrencyConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  convertedCurrency: string
  exchangeRate: number
  timestamp: string
}

interface UseCurrencyConversionReturn {
  convertedPrice: number | null
  isLoading: boolean
  error: string | null
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) => Promise<void>
}

export const useCurrencyConversion = (): UseCurrencyConversionReturn => {
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const convertCurrency = useCallback(async (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ) => {
    // Se as moedas são iguais, não precisa converter
    if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
      setConvertedPrice(amount)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/currency/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro na conversão de moeda')
      }

      setConvertedPrice(result.data.convertedAmount)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro na conversão de moeda:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    convertedPrice,
    isLoading,
    error,
    convertCurrency
  }
}
