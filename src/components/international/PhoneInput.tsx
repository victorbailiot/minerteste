'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { getPhoneCountryCodes, formatPhoneInternational, getPhoneMaxLength, getPhonePlaceholder } from '@/lib/international-utils'

interface PhoneInputProps {
  countryCode: string
  phoneNumber: string
  country: string
  onChange: (countryCode: string, phoneNumber: string) => void
  disabled?: boolean
  className?: string
  variant?: 'light' | 'dark' // 'light' para modais, 'dark' para páginas escuras
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  countryCode,
  phoneNumber,
  country,
  onChange,
  disabled = false,
  className = '',
  variant = 'dark'
}) => {
  const [isCodeSelectorOpen, setIsCodeSelectorOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [previousCountry, setPreviousCountry] = useState(country)
  
  // Memoizar phoneCodes para evitar recriação em cada render
  const phoneCodes = useMemo(() => getPhoneCountryCodes(), [])

  // Limpar telefone quando o país mudar
  useEffect(() => {
    if (previousCountry !== country) {
      onChange(countryCode, '') // Limpa o número de telefone
      setPreviousCountry(country)
    }
  }, [country, previousCountry, countryCode, onChange])

  const filteredCodes = useMemo(() => {
    if (!searchTerm) return phoneCodes
    const lower = searchTerm.toLowerCase()
    return phoneCodes.filter(c => 
      c.country.toLowerCase().includes(lower) || 
      c.code.includes(lower)
    )
  }, [searchTerm, phoneCodes])

  const selectedCode = useMemo(() => 
    phoneCodes.find(c => c.code === countryCode),
    [phoneCodes, countryCode]
  )

  const handleCodeSelect = (code: string) => {
    onChange(code, phoneNumber)
    setIsCodeSelectorOpen(false)
    setSearchTerm('')
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Remove não-dígitos
    const maxLength = getPhoneMaxLength(country)
    
    // Limita ao tamanho máximo do país
    const limitedValue = value.slice(0, maxLength)
    onChange(countryCode, limitedValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsCodeSelectorOpen(!isCodeSelectorOpen)
    } else if (e.key === 'Escape') {
      setIsCodeSelectorOpen(false)
    }
  }

  // Memoizar o telefone formatado para evitar recálculos desnecessários
  const formattedPhone = useMemo(() => 
    formatPhoneInternational(phoneNumber, countryCode, country),
    [phoneNumber, countryCode, country]
  )

  // Calcular maxLength e placeholder baseado no país
  const maxLength = useMemo(() => getPhoneMaxLength(country), [country])
  const placeholder = useMemo(() => getPhonePlaceholder(country), [country])

  const isLight = variant === 'light'

  return (
    <div className={className}>
      <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-white/90'}`}>
        Telefone *
      </label>
      
      <div className="flex gap-2">
        {/* Seletor de código de país */}
        <div className="relative w-32">
          <button
            type="button"
            onClick={() => !disabled && setIsCodeSelectorOpen(!isCodeSelectorOpen)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`w-full flex items-center justify-between px-2 py-3 border rounded-xl text-left text-sm transition-colors ${
              disabled 
                ? isLight
                  ? 'bg-gray-100 cursor-not-allowed border-gray-300'
                  : 'bg-white/5 cursor-not-allowed border-white/10'
                : isLight
                  ? 'bg-white border-gray-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900'
                  : 'bg-white/10 backdrop-blur-sm border-white/20 hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white'
            }`}
            aria-label="Selecionar código do país"
            aria-expanded={isCodeSelectorOpen}
            aria-haspopup="listbox"
          >
            <span className={`flex items-center gap-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {selectedCode ? (
                <>
                  <span>{selectedCode.flag}</span>
                  <span className="font-mono">{selectedCode.code}</span>
                </>
              ) : (
                <span className={isLight ? 'text-gray-500' : 'text-white/50'}>+XX</span>
              )}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${isCodeSelectorOpen ? 'rotate-180' : ''} ${isLight ? 'text-gray-400' : 'text-white/60'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown de códigos */}
          {isCodeSelectorOpen && !disabled && (
            <div className={`absolute z-50 w-64 mt-1 border rounded-xl shadow-2xl max-h-60 overflow-hidden left-0 ${
              isLight 
                ? 'bg-white border-gray-300' 
                : 'bg-black/90 backdrop-blur-md border-white/20'
            }`}>
              {/* Campo de busca */}
              <div className={`p-2 border-b ${isLight ? 'border-gray-200' : 'border-white/20'}`}>
                <input
                  type="text"
                  placeholder="Buscar código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500'
                      : 'bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:ring-amber-500/50'
                  }`}
                  aria-label="Buscar código do país"
                />
              </div>

              {/* Lista de códigos */}
              <ul className="overflow-y-auto max-h-48" role="listbox">
                {filteredCodes.length > 0 ? (
                  filteredCodes.map((code) => (
                    <li key={code.code}>
                      <button
                        type="button"
                        onClick={() => handleCodeSelect(code.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                          isLight
                            ? `text-gray-900 hover:bg-blue-50 ${code.code === countryCode ? 'bg-blue-100' : ''}`
                            : `text-white hover:bg-white/10 ${code.code === countryCode ? 'bg-amber-500/20' : ''}`
                        }`}
                        role="option"
                        aria-selected={code.code === countryCode}
                      >
                        <span className="flex items-center gap-2">
                          <span>{code.flag}</span>
                          <span>{code.country}</span>
                        </span>
                        <span className={`font-mono ${isLight ? 'text-gray-600' : 'text-white/80'}`}>{code.code}</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className={`px-3 py-2 text-sm text-center ${isLight ? 'text-gray-500' : 'text-white/60'}`}>
                    Nenhum código encontrado
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Input do número */}
        <input
          type="tel"
          value={formattedPhone}
          onChange={handlePhoneChange}
          disabled={disabled}
          maxLength={maxLength + 5}
          className={`flex-1 px-3 py-3 border rounded-xl transition-colors ${
            isLight
              ? disabled
                ? 'bg-gray-100 cursor-not-allowed border-gray-300 text-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
              : disabled
                ? 'bg-white/5 cursor-not-allowed border-white/10 text-white/50'
                : 'bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50'
          }`}
          placeholder={placeholder}
          aria-label="Número de telefone"
        />
      </div>
    </div>
  )
}

export default PhoneInput

