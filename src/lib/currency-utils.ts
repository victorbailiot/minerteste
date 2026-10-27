/**
 * Utilitários para Conversão de Moeda
 * Centraliza a lógica de conversão e formatação de moedas
 */

// Cache para taxas de câmbio (evita múltiplas chamadas à API)
let exchangeRatesCache: Record<string, number> | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hora em millisegundos

// Taxas de câmbio fixas como fallback (em relação ao USD)
const FALLBACK_RATES: Record<string, number> = {
  usd: 1.0,
  eur: 0.85,
  brl: 5.2,
  cad: 1.35,
  aud: 1.5,
  gbp: 0.75,
  jpy: 110,
  chf: 0.9,
  sek: 8.5,
  nok: 8.8,
  dkk: 6.3,
  pln: 3.8,
  czk: 22,
  huf: 300,
  ron: 4.2,
  hrk: 6.5,
  rub: 75,
  try: 8.5,
  inr: 75,
  sgd: 1.35,
  hkd: 7.8,
  nzd: 1.45,
  mxn: 20,
  ars: 100,
  clp: 800,
  cop: 3800,
  pen: 3.8,
  uyu: 42,
  pyg: 6800,
  bob: 6.9
}

/**
 * Buscar taxas de câmbio da API externa
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    // Usar API gratuita do ExchangeRate-API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid response format from API')
    }

    // Converter para o formato esperado (todas as taxas em relação ao USD)
    const rates: Record<string, number> = { usd: 1.0 }
    
    Object.entries(data.rates).forEach(([currency, rate]) => {
      if (typeof rate === 'number' && rate > 0) {
        rates[currency.toLowerCase()] = rate
      }
    })

    console.log('✅ Taxas de câmbio atualizadas da API:', Object.keys(rates).length, 'moedas')
    return rates

  } catch (error) {
    console.error('❌ Erro ao buscar taxas de câmbio da API:', error)
    console.log('🔄 Usando taxas de fallback...')
    return FALLBACK_RATES
  }
}

/**
 * Obter taxas de câmbio (com cache)
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now()
  
  // Verificar se o cache ainda é válido
  if (exchangeRatesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return exchangeRatesCache
  }

  // Buscar novas taxas da API
  const rates = await fetchExchangeRates()
  
  // Atualizar cache
  exchangeRatesCache = rates
  cacheTimestamp = now
  
  return rates
}

/**
 * Converter valor entre moedas
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  convertedCurrency: string
  exchangeRate: number
  source: string
}> {
  // Se as moedas são iguais, não converter
  if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency.toUpperCase(),
      convertedAmount: Math.round(amount * 100) / 100,
      convertedCurrency: toCurrency.toUpperCase(),
      exchangeRate: 1,
      source: 'Same Currency'
    }
  }

  // Obter taxas de câmbio
  const rates = await getExchangeRates()

  // Validar moedas
  if (!rates[fromCurrency.toLowerCase()]) {
    throw new Error(`Moeda de origem não suportada: ${fromCurrency}`)
  }

  if (!rates[toCurrency.toLowerCase()]) {
    throw new Error(`Moeda de destino não suportada: ${toCurrency}`)
  }

  const fromRate = rates[fromCurrency.toLowerCase()]
  const toRate = rates[toCurrency.toLowerCase()]

  // Converter para USD primeiro, depois para a moeda de destino
  const usdAmount = amount / fromRate
  const convertedAmount = usdAmount * toRate

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency.toUpperCase(),
    convertedAmount: Math.round(convertedAmount * 100) / 100, // Arredondar para 2 casas decimais
    convertedCurrency: toCurrency.toUpperCase(),
    exchangeRate: toRate / fromRate,
    source: exchangeRatesCache ? 'API' : 'Fallback'
  }
}

/**
 * Formatar valor monetário
 */
export function formatCurrencyValue(
  amount: number,
  currency: string,
  locale: string = 'pt-BR'
): string {
  const currencyUpper = currency.toUpperCase()
  
  // Mapear códigos de moeda para códigos ISO
  const currencyMap: Record<string, string> = {
    'USD': 'USD',
    'EUR': 'EUR',
    'BRL': 'BRL',
    'CAD': 'CAD',
    'AUD': 'AUD',
    'GBP': 'GBP',
    'JPY': 'JPY',
    'CHF': 'CHF',
    'SEK': 'SEK',
    'NOK': 'NOK',
    'DKK': 'DKK',
    'PLN': 'PLN',
    'CZK': 'CZK',
    'HUF': 'HUF',
    'RON': 'RON',
    'HRK': 'HRK',
    'RUB': 'RUB',
    'TRY': 'TRY',
    'INR': 'INR',
    'SGD': 'SGD',
    'HKD': 'HKD',
    'NZD': 'NZD',
    'MXN': 'MXN',
    'ARS': 'ARS',
    'CLP': 'CLP',
    'COP': 'COP',
    'PEN': 'PEN',
    'UYU': 'UYU',
    'PYG': 'PYG',
    'BOB': 'BOB'
  }

  const isoCurrency = currencyMap[currencyUpper] || currencyUpper

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: isoCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch (error) {
    // Fallback para formatação simples
    return `${currencyUpper} ${amount.toFixed(2)}`
  }
}

/**
 * Obter símbolo da moeda
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    usd: '$',
    eur: '€',
    brl: 'R$',
    cad: 'C$',
    aud: 'A$',
    gbp: '£',
    jpy: '¥',
    chf: 'CHF',
    sek: 'kr',
    nok: 'kr',
    dkk: 'kr',
    pln: 'zł',
    czk: 'Kč',
    huf: 'Ft',
    ron: 'lei',
    hrk: 'kn',
    rub: '₽',
    try: '₺',
    inr: '₹',
    sgd: 'S$',
    hkd: 'HK$',
    nzd: 'NZ$',
    mxn: '$',
    ars: '$',
    clp: '$',
    cop: '$',
    pen: 'S/',
    uyu: '$U',
    pyg: '₲',
    bob: 'Bs'
  }
  
  return symbols[currency.toLowerCase()] || currency.toUpperCase()
}

/**
 * Limpar cache de taxas de câmbio
 */
export function clearExchangeRatesCache(): void {
  exchangeRatesCache = null
  cacheTimestamp = 0
}

/**
 * Verificar se cache está válido
 */
export function isCacheValid(): boolean {
  const now = Date.now()
  return !!(exchangeRatesCache && (now - cacheTimestamp) < CACHE_DURATION)
}
