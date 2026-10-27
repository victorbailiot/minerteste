/**
 * Configuração do Stripe para Frontend
 * Contém apenas as configurações seguras para o cliente
 */

// Chave pública do Stripe (segura para usar no frontend)
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'

// Verificar se a chave está configurada
export const isStripeConfigured = STRIPE_PUBLISHABLE_KEY !== 'pk_test_placeholder'

// Configurações do Stripe Elements
export const STRIPE_ELEMENTS_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
}

// Moedas suportadas
export const SUPPORTED_CURRENCIES = [
  'usd', 'eur', 'brl', 'cad', 'aud', 'gbp', 'jpy', 'chf', 'sek', 'nok', 'dkk',
  'pln', 'czk', 'huf', 'ron', 'hrk', 'rub', 'try', 'inr', 'sgd', 'hkd', 'nzd',
  'mxn', 'ars', 'clp', 'cop', 'pen', 'uyu', 'pyg', 'bob'
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

// Função para verificar se uma moeda é suportada
export const isSupportedCurrency = (currency: string): currency is SupportedCurrency => {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)
}

