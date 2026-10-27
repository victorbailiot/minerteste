'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { DocumentType } from '@/generated/prisma'
import {
  formatDocument,
  getDocumentTypesByCountry,
  validateDocument
} from '@/lib/international-utils'

interface DocumentInputProps {
  country: string
  documentType: DocumentType | ''
  documentNumber: string
  onChange: (documentType: DocumentType, documentNumber: string) => void
  disabled?: boolean
  className?: string
  variant?: 'light' | 'dark' // 'light' para modais, 'dark' para páginas escuras
}

export const DocumentInput: React.FC<DocumentInputProps> = ({
  country,
  documentType,
  documentNumber,
  onChange,
  disabled = false,
  className = '',
  variant = 'dark'
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null)

  const availableDocuments = useMemo(() => {
    if (!country) return []
    return getDocumentTypesByCountry(country)
  }, [country])

  const isCurrentTypeAvailable = documentType
    ? availableDocuments.some(doc => doc.type === documentType)
    : false

  const currentType = isCurrentTypeAvailable ? documentType : ''
  const selectedDocInfo = currentType
    ? availableDocuments.find(doc => doc.type === currentType)
    : undefined

  useEffect(() => {
    if (currentType && documentNumber && country) {
      const valid = validateDocument(currentType, documentNumber, country)
      setIsValid(valid)
    } else {
      setIsValid(null)
    }
  }, [currentType, documentNumber, country])

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as DocumentType
    if (!newType) {
      onChange('' as DocumentType, '')
      return
    }

    onChange(newType, '')
  }

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    if (!currentType) {
      return
    }

    const formattedValue = formatDocument(currentType, value, country)
    onChange(currentType, formattedValue)
  }

  const isLight = variant === 'light'

  return (
    <div className={className}>
      <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-white/90'}`}>
        Tipo de Documento *
      </label>

      <div className="space-y-3">
        <select
          value={currentType}
          onChange={handleTypeChange}
          disabled={disabled || !country}
          className={`w-full px-3 py-3 border rounded-xl focus:outline-none focus:ring-2 disabled:cursor-not-allowed ${
            isLight
              ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 [&>option]:bg-white [&>option]:text-gray-900'
              : 'bg-white/10 backdrop-blur-sm border-white/20 text-white focus:ring-amber-500/50 focus:border-amber-500/50 disabled:bg-white/5 [&>option]:bg-black [&>option]:text-white'
          }`}
          aria-label="Tipo de documento"
        >
          <option value="">Selecione o tipo de documento</option>
          {availableDocuments.map(doc => (
            <option key={doc.type} value={doc.type}>
              {doc.label}
            </option>
          ))}
        </select>

        {currentType && selectedDocInfo && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-white/90'}`}>
              {selectedDocInfo.label} *
            </label>
            <div className="relative">
              <input
                type="text"
                value={documentNumber}
                onChange={handleNumberChange}
                disabled={disabled}
                maxLength={selectedDocInfo.maxLength}
                className={`w-full px-3 py-3 border rounded-xl focus:outline-none focus:ring-2 disabled:cursor-not-allowed pr-10 ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100'
                    : 'bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:bg-white/5'
                }`}
                placeholder={selectedDocInfo.example}
                aria-label="Numero do documento"
                aria-invalid={isValid === false}
              />

              {isValid === true && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className={`w-5 h-5 ${isLight ? 'text-green-500' : 'text-green-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {isValid === false && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className={`w-5 h-5 ${isLight ? 'text-red-500' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>

            {isValid === false && documentNumber && (
              <p className={`mt-1 text-sm ${isLight ? 'text-red-600' : 'text-red-300'}`}>
                {selectedDocInfo.label} invalido
              </p>
            )}

            {!documentNumber && selectedDocInfo.example && (
              <p className={`mt-1 text-xs ${isLight ? 'text-gray-500' : 'text-white/60'}`}>
                Exemplo: {selectedDocInfo.example}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentInput
