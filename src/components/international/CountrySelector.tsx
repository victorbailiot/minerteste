'use client'

import React, { useState, useMemo } from 'react'
import { getCountriesList, type Country } from '@/lib/international-utils'

interface CountrySelectorProps {
  value: string
  onChange: (country: Country) => void
  disabled?: boolean
  className?: string
  variant?: 'light' | 'dark' // 'light' para modais, 'dark' para páginas escuras
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  variant = 'dark'
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  // Memoizar a lista de países para evitar recriação em cada render
  const countries = useMemo(() => getCountriesList(), [])

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries
    const lower = searchTerm.toLowerCase()
    return countries.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.code.toLowerCase().includes(lower)
    )
  }, [searchTerm, countries])

  const selectedCountry = useMemo(() => 
    countries.find(c => c.code === value),
    [countries, value]
  )

  const handleSelect = (country: Country) => {
    onChange(country)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const isLight = variant === 'light'
  
  return (
    <div className={`relative ${className}`}>
      <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-white/90'}`}>
        País *
      </label>
      
      {/* Seletor */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-3 border rounded-xl text-left transition-colors ${
          disabled 
            ? isLight
              ? 'bg-gray-100 cursor-not-allowed border-gray-300'
              : 'bg-white/5 cursor-not-allowed border-white/10'
            : isLight
              ? 'bg-white border-gray-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900'
              : 'bg-white/10 backdrop-blur-sm border-white/20 hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white'
        }`}
        aria-label="Selecionar país"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {selectedCountry ? (
            <>
              <span className="text-2xl">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <span className={isLight ? 'text-gray-500' : 'text-white/50'}>Selecione um país</span>
          )}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${isLight ? 'text-gray-400' : 'text-white/60'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className={`absolute z-50 w-full mt-1 border rounded-xl shadow-2xl max-h-50 overflow-hidden ${
          isLight 
            ? 'bg-white border-gray-300' 
            : 'bg-black/90 backdrop-blur-md border-white/20'
        }`}>
          {/* Campo de busca */}
          <div className={`p-2 border-b ${isLight ? 'border-gray-200' : 'border-white/20'}`}>
            <input
              type="text"
              placeholder="Buscar país..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500'
                  : 'bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:ring-amber-500/50'
              }`}
              aria-label="Buscar país"
            />
          </div>

          {/* Lista de países */}
          <ul className="overflow-y-auto max-h-48" role="listbox">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors ${
                      isLight
                        ? `text-gray-900 hover:bg-blue-50 ${country.code === value ? 'bg-blue-100' : ''}`
                        : `text-white hover:bg-white/10 ${country.code === value ? 'bg-amber-500/20' : ''}`
                    }`}
                    role="option"
                    aria-selected={country.code === value}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <span>{country.name}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className={`px-4 py-2 text-center ${isLight ? 'text-gray-500' : 'text-white/60'}`}>
                Nenhum país encontrado
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default CountrySelector

