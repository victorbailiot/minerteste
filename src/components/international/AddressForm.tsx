'use client'

import React, { useState, useEffect } from 'react'
import { 
  formatPostalCode, 
  validatePostalCode, 
  getStatesOrProvinces, 
  getPostalCodeFormat 
} from '@/lib/international-utils'

export interface AddressData {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface AddressFormProps {
  address: AddressData
  onChange: (address: AddressData) => void
  country: string
  disabled?: boolean
  className?: string
}

export const AddressForm: React.FC<AddressFormProps> = ({
  address,
  onChange,
  country,
  disabled = false,
  className = ''
}) => {
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [postalCodeValid, setPostalCodeValid] = useState<boolean | null>(null)
  const states = getStatesOrProvinces(country)
  const postalCodeFormat = getPostalCodeFormat(country)

  useEffect(() => {
    // Validar código postal quando mudar
    if (address.postalCode) {
      const valid = validatePostalCode(address.postalCode, country)
      setPostalCodeValid(valid)
    } else {
      setPostalCodeValid(null)
    }
  }, [address.postalCode, country])

  const handleChange = (field: keyof AddressData, value: string) => {
    onChange({
      ...address,
      [field]: value
    })
  }

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPostalCode(value, country)
    handleChange('postalCode', formatted)

    // Buscar endereço automaticamente para Brasil
    if (country === 'BR' && formatted.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(formatted)
    }
  }

  const fetchAddressByCep = async (cep: string) => {
    setIsLoadingCep(true)
    try {
      const response = await fetch(`/api/cep?cep=${cep}`)
      const result = await response.json()

      if (result.success) {
        const { street, city, state, neighborhood } = result.data
        onChange({
          ...address,
          street: street || address.street,
          city: city || address.city,
          state: state || address.state,
          neighborhood: neighborhood || address.neighborhood,
          postalCode: cep
        })
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    } finally {
      setIsLoadingCep(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="font-medium text-gray-900">Endereço (Opcional)</h3>
      
      {/* CEP / Código Postal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {country === 'BR' ? 'CEP' : 'Código Postal'}
        </label>
        <div className="relative">
          <input
            type="text"
            value={address.postalCode}
            onChange={handlePostalCodeChange}
            disabled={disabled}
            maxLength={postalCodeFormat.maxLength + 2} // Adicional para formatação
            className={`w-full px-3 py-3 border rounded-lg ${
              disabled 
                ? 'bg-gray-100 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
            } ${
              postalCodeValid === false 
                ? 'border-red-500' 
                : postalCodeValid === true 
                ? 'border-green-500' 
                : 'border-gray-300'
            }`}
            placeholder={postalCodeFormat.example}
            aria-label="Código postal"
          />
          
          {isLoadingCep && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
        
        {postalCodeValid === true && address.postalCode && (
          <p className="mt-1 text-xs text-green-600">
            ✓ Endereço preenchido automaticamente
          </p>
        )}
      </div>

      {/* Estado / Província */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {country === 'BR' ? 'Estado' : 'Estado/Província'}
        </label>
        {states.length > 0 ? (
          <select
            value={address.state}
            onChange={(e) => handleChange('state', e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-3 border rounded-lg ${
              disabled 
                ? 'bg-gray-100 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
            } border-gray-300`}
            aria-label="Estado ou província"
          >
            <option value="">Selecione</option>
            {states.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={address.state}
            onChange={(e) => handleChange('state', e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-3 border rounded-lg ${
              disabled 
                ? 'bg-gray-100 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
            } border-gray-300`}
            placeholder="Digite o estado"
            aria-label="Estado ou província"
          />
        )}
      </div>

      {/* Cidade */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cidade
        </label>
        <input
          type="text"
          value={address.city}
          onChange={(e) => handleChange('city', e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-3 border rounded-lg ${
            disabled 
              ? 'bg-gray-100 cursor-not-allowed' 
              : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
          } border-gray-300`}
          placeholder="Digite a cidade"
          aria-label="Cidade"
        />
      </div>

      {/* Bairro */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bairro
        </label>
        <input
          type="text"
          value={address.neighborhood}
          onChange={(e) => handleChange('neighborhood', e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-3 border rounded-lg ${
            disabled 
              ? 'bg-gray-100 cursor-not-allowed' 
              : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
          } border-gray-300`}
          placeholder="Digite o bairro"
          aria-label="Bairro"
        />
      </div>

      {/* Rua e Número */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rua/Avenida
          </label>
          <input
            type="text"
            value={address.street}
            onChange={(e) => handleChange('street', e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-3 border rounded-lg ${
              disabled 
                ? 'bg-gray-100 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
            } border-gray-300`}
            placeholder="Digite a rua"
            aria-label="Rua ou avenida"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número
          </label>
          <input
            type="text"
            value={address.number}
            onChange={(e) => handleChange('number', e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-3 border rounded-lg ${
              disabled 
                ? 'bg-gray-100 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
            } border-gray-300`}
            placeholder="123"
            aria-label="Número"
          />
        </div>
      </div>

      {/* Complemento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Complemento (Opcional)
        </label>
        <input
          type="text"
          value={address.complement || ''}
          onChange={(e) => handleChange('complement', e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-3 border rounded-lg ${
            disabled 
              ? 'bg-gray-100 cursor-not-allowed' 
              : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
          } border-gray-300`}
          placeholder="Apto, Bloco, etc."
          aria-label="Complemento"
        />
      </div>
    </div>
  )
}

export default AddressForm









