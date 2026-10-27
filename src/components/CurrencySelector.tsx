/**
 * Seletor de Moeda
 * Permite escolher a moeda para pagamento
 */

'use client'

import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface CurrencySelectorProps {
  value?: string
  onValueChange?: (currency: string) => void
  className?: string
}

const currencies = [
  { code: 'brl', name: 'Real Brasileiro', symbol: 'R$' },
  { code: 'usd', name: 'Dólar Americano', symbol: '$' },
  { code: 'eur', name: 'Euro', symbol: '€' },
  { code: 'gbp', name: 'Libra Esterlina', symbol: '£' },
]

export default function CurrencySelector({ 
  value, 
  onValueChange, 
  className = '' 
}: CurrencySelectorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState('brl')

  // Carregar moeda do localStorage ao montar o componente
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency')
    if (savedCurrency && savedCurrency !== selectedCurrency) {
      setSelectedCurrency(savedCurrency)
      onValueChange?.(savedCurrency)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onValueChange])

  // Atualizar valor quando a prop value mudar
  useEffect(() => {
    if (value && value !== selectedCurrency) {
      setSelectedCurrency(value)
    }
  }, [value, selectedCurrency])

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency)
    localStorage.setItem('selectedCurrency', currency)
    onValueChange?.(currency)
  }

  const getCurrentCurrency = () => {
    return currencies.find(c => c.code === selectedCurrency) || currencies[0]
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-gray-500" />
      <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getCurrentCurrency().symbol}
              </Badge>
              <span className="text-sm font-medium">
                {getCurrentCurrency().code.toUpperCase()}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {currency.symbol}
                </Badge>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {currency.code.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {currency.name}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
