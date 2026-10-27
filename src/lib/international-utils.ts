/**
 * Utilitários para suporte internacional
 * Funções de validação, formatação e máscaras para documentos, telefones e endereços
 */

import { DocumentType } from '@/generated/prisma'

// ==================== PAÍSES ====================

export interface Country {
  code: string
  name: string
  flag: string
  phoneCode: string
}

export const SUPPORTED_COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', phoneCode: '+55' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', phoneCode: '+1' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', phoneCode: '+1' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phoneCode: '+54' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phoneCode: '+351' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', phoneCode: '+34' },
  { code: 'MX', name: 'México', flag: '🇲🇽', phoneCode: '+52' },
  { code: 'CO', name: 'Colômbia', flag: '🇨🇴', phoneCode: '+57' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phoneCode: '+56' },
  { code: 'UY', name: 'Uruguai', flag: '🇺🇾', phoneCode: '+598' },
  { code: 'PY', name: 'Paraguai', flag: '🇵🇾', phoneCode: '+595' },
  { code: 'BO', name: 'Bolívia', flag: '🇧🇴', phoneCode: '+591' },
  { code: 'CH', name: 'Suíça', flag: '🇨🇭', phoneCode: '+41' },
  { code: 'ZA', name: 'África do Sul', flag: '🇿🇦', phoneCode: '+27' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', phoneCode: '+244' },
  { code: 'MZ', name: 'Moçambique', flag: '🇲🇿', phoneCode: '+258' },
]

export function getCountriesList(): Country[] {
  // Retorna a lista ordenada alfabeticamente por nome
  return [...SUPPORTED_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function getCountryByCode(code: string): Country | undefined {
  return SUPPORTED_COUNTRIES.find(c => c.code === code)
}

export function getPhoneCountryCodes(): Array<{ code: string; country: string; flag: string }> {
  return SUPPORTED_COUNTRIES.map(c => ({
    code: c.phoneCode,
    country: c.name,
    flag: c.flag
  }))
}

// ==================== DOCUMENTOS ====================

export interface DocumentTypeInfo {
  type: DocumentType
  label: string
  mask: string
  maxLength: number
  example: string
}

export function getDocumentTypesByCountry(country: string): DocumentTypeInfo[] {
  const documentsByCountry: Record<string, DocumentTypeInfo[]> = {
    BR: [
      {
        type: DocumentType.CPF,
        label: 'CPF',
        mask: '999.999.999-99',
        maxLength: 14,
        example: '123.456.789-00'
      }
    ],
    US: [
      {
        type: DocumentType.SSN,
        label: 'SSN',
        mask: '999-99-9999',
        maxLength: 11,
        example: '123-45-6789'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Passport',
        mask: '',
        maxLength: 15,
        example: 'AB1234567'
      }
    ],
    AR: [
      {
        type: DocumentType.DNI,
        label: 'DNI',
        mask: '99.999.999',
        maxLength: 10,
        example: '12.345.678'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Pasaporte',
        mask: '',
        maxLength: 15,
        example: 'AAA123456'
      }
    ],
    ES: [
      {
        type: DocumentType.DNI,
        label: 'DNI',
        mask: '99999999A',
        maxLength: 9,
        example: '12345678Z'
      },
      {
        type: DocumentType.NIE,
        label: 'NIE',
        mask: 'X9999999A',
        maxLength: 9,
        example: 'X1234567L'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Pasaporte',
        mask: '',
        maxLength: 15,
        example: 'AAA123456'
      }
    ],
    CL: [
      {
        type: DocumentType.RUT,
        label: 'RUT',
        mask: '99.999.999-9',
        maxLength: 12,
        example: '12.345.678-5'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Pasaporte',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ],
    UY: [
      {
        type: DocumentType.CI,
        label: 'CI',
        mask: '9.999.999-9',
        maxLength: 11,
        example: '1.234.567-8'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Pasaporte',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ],
    PY: [
      {
        type: DocumentType.CI,
        label: 'CI',
        mask: '9.999.999',
        maxLength: 9,
        example: '1.234.567'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Pasaporte',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ],
    CA: [
      {
        type: DocumentType.SSN,
        label: 'SIN (Social Insurance Number)',
        mask: '999-999-999',
        maxLength: 11,
        example: '123-456-789'
      },
      {
        type: DocumentType.NATIONAL_ID,
        label: 'Driver\'s License',
        mask: '',
        maxLength: 20,
        example: 'A1234-56789-01234'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Passport',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ],
    CH: [
      {
        type: DocumentType.NATIONAL_ID,
        label: 'AHV-Nummer (Número de Identidade Suíço)',
        mask: '999.9999.9999.99',
        maxLength: 16,
        example: '756.1234.5678.90'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Passaporte',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ],
    ZA: [
      {
        type: DocumentType.NATIONAL_ID,
        label: 'Smart ID Card (Cartão de Identidade)',
        mask: '9999999999999',
        maxLength: 13,
        example: '9001015800085'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Passport',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ],
    AO: [
      {
        type: DocumentType.NATIONAL_ID,
        label: 'BI (Bilhete de Identidade)',
        mask: '9999999999999',
        maxLength: 14,
        example: '12345678901234'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Passaporte',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ],
    MZ: [
      {
        type: DocumentType.NATIONAL_ID,
        label: 'BI (Bilhete de Identidade)',
        mask: '999999999999',
        maxLength: 12,
        example: '123456789012'
      },
      {
        type: DocumentType.PASSPORT,
        label: 'Passaporte',
        mask: '',
        maxLength: 15,
        example: 'AB123456'
      }
    ]
  }

  // Países que não têm configuração específica recebem opções genéricas
  const defaultDocuments: DocumentTypeInfo[] = [
    {
      type: DocumentType.NATIONAL_ID,
      label: 'National ID',
      mask: '',
      maxLength: 20,
      example: '123456789'
    },
    {
      type: DocumentType.PASSPORT,
      label: 'Passport',
      mask: '',
      maxLength: 15,
      example: 'AB123456'
    }
  ]

  return documentsByCountry[country] || defaultDocuments
}

export function validateDocument(
  documentType: DocumentType,
  documentNumber: string,
  country: string
): boolean {
  // Remove caracteres não alfanuméricos
  const clean = documentNumber.replace(/[^a-zA-Z0-9]/g, '')

  switch (documentType) {
    case DocumentType.CPF:
      return validateCPF(clean)
    
    case DocumentType.SSN:
      // Valida tanto SSN (EUA) quanto SIN (Canadá)
      return validateSSN(clean)
    
    case DocumentType.DNI:
      if (country === 'AR') return validateDNIArgentina(clean)
      if (country === 'ES') return validateDNISpain(clean)
      return clean.length >= 7 && clean.length <= 10
    
    case DocumentType.RUT:
      return validateRUT(clean)
    
    case DocumentType.PASSPORT:
      return clean.length >= 6 && clean.length <= 15
    
    case DocumentType.NATIONAL_ID:
      // Driver's License no Canadá ou outros documentos nacionais
      if (country === 'CA') {
        // Driver's License canadense varia por província, mas geralmente tem 8-20 caracteres alfanuméricos
        return clean.length >= 8 && clean.length <= 20 && /^[A-Z0-9]+$/.test(clean)
      }
      // AHV-Nummer suíço: 13 dígitos, começa com 756
      if (country === 'CH') {
        return clean.length === 13 && /^756\d{10}$/.test(clean)
      }
      // Smart ID Card sul-africano: 13 dígitos no formato YYMMDDSSSSCAZ
      if (country === 'ZA') {
        return clean.length === 13 && /^\d{13}$/.test(clean)
      }
      // BI Angola: até 14 caracteres alfanuméricos
      if (country === 'AO') {
        return clean.length >= 9 && clean.length <= 14 && /^[A-Za-z0-9]+$/.test(clean)
      }
      // BI Moçambique: 9 a 12 dígitos
      if (country === 'MZ') {
        return clean.length >= 9 && clean.length <= 12 && /^\d+$/.test(clean)
      }
      return clean.length >= 5 && clean.length <= 20
    
    case DocumentType.CI:
    case DocumentType.RG:
    case DocumentType.NIE:
    case DocumentType.OTHER:
      return clean.length >= 5 && clean.length <= 20
    
    default:
      return false
  }
}

function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (parseInt(cpf.charAt(9)) !== digit1) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  return parseInt(cpf.charAt(10)) === digit2
}

function validateSSN(ssn: string): boolean {
  return ssn.length === 9 && /^\d{9}$/.test(ssn)
}

function validateDNIArgentina(dni: string): boolean {
  return dni.length >= 7 && dni.length <= 8 && /^\d+$/.test(dni)
}

function validateDNISpain(dni: string): boolean {
  if (dni.length !== 9) return false
  
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const number = parseInt(dni.substring(0, 8))
  const letter = dni.charAt(8).toUpperCase()
  
  return letters.charAt(number % 23) === letter
}

function validateRUT(rut: string): boolean {
  if (rut.length < 8 || rut.length > 9) return false
  
  const body = rut.slice(0, -1)
  const digit = rut.slice(-1).toUpperCase()
  
  let sum = 0
  let multiplier = 2
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i)) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  
  const expectedDigit = 11 - (sum % 11)
  const calculatedDigit = expectedDigit === 11 ? '0' : expectedDigit === 10 ? 'K' : expectedDigit.toString()
  
  return calculatedDigit === digit
}

export function formatDocument(documentType: DocumentType, documentNumber: string, country?: string): string {
  const clean = documentNumber.replace(/[^a-zA-Z0-9]/g, '')

  switch (documentType) {
    case DocumentType.CPF:
      return formatCPF(clean)
    
    case DocumentType.SSN:
      // Formata tanto SSN (EUA) quanto SIN (Canadá) no mesmo formato
      return formatSSN(clean)
    
    case DocumentType.RUT:
      return formatRUT(clean)
    
    case DocumentType.DNI:
    case DocumentType.CI:
      return formatGenericWithDots(clean)
    
    case DocumentType.NATIONAL_ID:
      // AHV-Nummer suíço: 756.XXXX.XXXX.XX
      if (country === 'CH' && clean.length === 13) {
        return `${clean.slice(0, 3)}.${clean.slice(3, 7)}.${clean.slice(7, 11)}.${clean.slice(11, 13)}`
      }
      // Smart ID Card sul-africano: 13 dígitos sem formatação especial
      if (country === 'ZA' && clean.length === 13) {
        return clean // Mantém sem formatação, apenas números
      }
      return clean
    
    default:
      return clean
  }
}

function formatCPF(cpf: string): string {
  if (cpf.length <= 3) return cpf
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
}

function formatSSN(ssn: string): string {
  if (ssn.length <= 3) return ssn
  if (ssn.length <= 5) return `${ssn.slice(0, 3)}-${ssn.slice(3)}`
  return `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5, 9)}`
}

function formatRUT(rut: string): string {
  if (rut.length <= 2) return rut
  if (rut.length <= 5) return `${rut.slice(0, -1)}.${rut.slice(-1)}`
  if (rut.length <= 8) {
    const body = rut.slice(0, -1)
    const digit = rut.slice(-1)
    return `${body.slice(0, -3)}.${body.slice(-3)}-${digit}`
  }
  const body = rut.slice(0, -1)
  const digit = rut.slice(-1)
  return `${body.slice(0, 2)}.${body.slice(2, 5)}.${body.slice(5)}-${digit}`
}

function formatGenericWithDots(value: string): string {
  if (value.length <= 3) return value
  if (value.length <= 6) return `${value.slice(0, 3)}.${value.slice(3)}`
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`
}

export function getDocumentMask(documentType: DocumentType, country: string): string {
  const documents = getDocumentTypesByCountry(country)
  const doc = documents.find(d => d.type === documentType)
  return doc?.mask || ''
}

// ==================== TELEFONE ====================

export function getPhoneMaxLength(country: string): number {
  switch (country) {
    case 'BR':
      return 11 // (11) 99999-9999
    
    case 'US':
    case 'CA':
    case 'MX':
      return 10 // (999) 999-9999
    
    case 'AR':
      return 11 // Até 11 dígitos
    
    case 'PT':
    case 'ES':
    case 'CO':
    case 'CL':
      return 9 // 9 dígitos
    
    case 'UY':
    case 'PY':
    case 'BO':
      return 9 // 8-9 dígitos
    
    case 'CH':
      return 9 // 9 dígitos (código de área 1-2 dígitos + número local 7-8 dígitos)
    
    case 'ZA':
      return 9 // 9 dígitos (sem o zero inicial)
    
    case 'AO':
    case 'MZ':
      return 9 // 9 dígitos (celular)
    
    default:
      return 15 // Máximo internacional
  }
}

export function getPhonePlaceholder(country: string): string {
  switch (country) {
    case 'BR':
      return '(11) 99999-9999'
    
    case 'US':
      return '(555) 123-4567'
    
    case 'CA':
      return '(555) 123-4567'
    
    case 'AR':
      return '11 1234-5678'
    
    case 'PT':
      return '912 345 678'
    
    case 'ES':
      return '612 34 56 78'
    
    case 'MX':
      return '55 1234 5678'
    
    case 'CO':
      return '300 123 4567'
    
    case 'CL':
      return '9 1234 5678'
    
    case 'UY':
      return '94 123 456'
    
    case 'PY':
      return '961 123456'
    
    case 'BO':
      return '7123 4567'
    
    case 'CH':
      return '31 123 45 67'
    
    case 'ZA':
      return '11 123 4567'
    
    case 'AO':
      return '923 456 789'
    
    case 'MZ':
      return '84 123 4567'
    
    default:
      return '123456789'
  }
}

export function validatePhone(phone: string, countryCode: string, country: string): boolean {
  const clean = phone.replace(/\D/g, '')

  switch (country) {
    case 'BR':
      return clean.length === 10 || clean.length === 11
    
    case 'US':
    case 'CA':
      return clean.length === 10
    
    case 'AR':
      return clean.length >= 10 && clean.length <= 11
    
    case 'PT':
    case 'ES':
      return clean.length === 9
    
    case 'MX':
      return clean.length === 10
    
    case 'CO':
    case 'CL':
      return clean.length === 9
    
    case 'UY':
    case 'PY':
    case 'BO':
      return clean.length >= 8 && clean.length <= 9
    
    case 'CH':
      return clean.length >= 8 && clean.length <= 9 // 8-9 dígitos (sem código de área)
    
    case 'ZA':
      return clean.length === 9 // 9 dígitos (sem o zero inicial)
    
    case 'AO':
    case 'MZ':
      return clean.length === 9 // 9 dígitos
    
    default:
      return clean.length >= 8 && clean.length <= 15
  }
}

export function formatPhoneInternational(phone: string, countryCode: string, country: string): string {
  const clean = phone.replace(/\D/g, '')

  switch (country) {
    case 'BR':
      // Placeholder: (11) 99999-9999
      if (clean.length === 11) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
      }
      if (clean.length === 10) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
      }
      if (clean.length > 2) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
      }
      return clean
    
    case 'US':
    case 'CA':
      // Placeholder: (555) 123-4567
      if (clean.length >= 10) {
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`
      }
      if (clean.length > 6) {
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`
      }
      if (clean.length > 3) {
        return `(${clean.slice(0, 3)}) ${clean.slice(3)}`
      }
      return clean
    
    case 'AR':
      // Placeholder: 11 1234-5678
      if (clean.length >= 10) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 6)}-${clean.slice(6, 10)}`
      }
      if (clean.length > 6) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 6)}-${clean.slice(6)}`
      }
      if (clean.length > 2) {
        return `${clean.slice(0, 2)} ${clean.slice(2)}`
      }
      return clean
    
    case 'PT':
      // Placeholder: 912 345 678
      if (clean.length >= 9) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`
      }
      if (clean.length > 6) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
      }
      if (clean.length > 3) {
        return `${clean.slice(0, 3)} ${clean.slice(3)}`
      }
      return clean
    
    case 'ES':
      // Placeholder: 612 34 56 78
      if (clean.length >= 9) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 9)}`
      }
      if (clean.length > 7) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7)}`
      }
      if (clean.length > 5) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5)}`
      }
      if (clean.length > 3) {
        return `${clean.slice(0, 3)} ${clean.slice(3)}`
      }
      return clean
    
    case 'MX':
      // Placeholder: 55 1234 5678
      if (clean.length >= 10) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 6)} ${clean.slice(6, 10)}`
      }
      if (clean.length > 6) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 6)} ${clean.slice(6)}`
      }
      if (clean.length > 2) {
        return `${clean.slice(0, 2)} ${clean.slice(2)}`
      }
      return clean
    
    case 'CO':
      // Placeholder: 300 123 4567
      if (clean.length >= 10) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 10)}`
      }
      if (clean.length > 6) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
      }
      if (clean.length > 3) {
        return `${clean.slice(0, 3)} ${clean.slice(3)}`
      }
      return clean
    
    case 'CL':
      // Placeholder: 9 1234 5678
      if (clean.length >= 9) {
        return `${clean.slice(0, 1)} ${clean.slice(1, 5)} ${clean.slice(5, 9)}`
      }
      if (clean.length > 5) {
        return `${clean.slice(0, 1)} ${clean.slice(1, 5)} ${clean.slice(5)}`
      }
      if (clean.length > 1) {
        return `${clean.slice(0, 1)} ${clean.slice(1)}`
      }
      return clean
    
    case 'UY':
      // Placeholder: 94 123 456
      if (clean.length >= 8) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)}`
      }
      if (clean.length > 5) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`
      }
      if (clean.length > 2) {
        return `${clean.slice(0, 2)} ${clean.slice(2)}`
      }
      return clean
    
    case 'PY':
      // Placeholder: 961 123456
      if (clean.length >= 9) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 9)}`
      }
      if (clean.length > 3) {
        return `${clean.slice(0, 3)} ${clean.slice(3)}`
      }
      return clean
    
    case 'BO':
      // Placeholder: 7123 4567
      if (clean.length >= 8) {
        return `${clean.slice(0, 4)} ${clean.slice(4, 8)}`
      }
      if (clean.length > 4) {
        return `${clean.slice(0, 4)} ${clean.slice(4)}`
      }
      return clean
    
    case 'CH':
      // Placeholder: 31 123 45 67
      if (clean.length >= 9) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 9)}`
      }
      if (clean.length > 7) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 7)} ${clean.slice(7)}`
      }
      if (clean.length > 5) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`
      }
      if (clean.length > 2) {
        return `${clean.slice(0, 2)} ${clean.slice(2)}`
      }
      return clean
    
    case 'ZA':
      // Placeholder: 11 123 4567
      if (clean.length >= 9) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 9)}`
      }
      if (clean.length > 5) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`
      }
      if (clean.length > 2) {
        return `${clean.slice(0, 2)} ${clean.slice(2)}`
      }
      return clean
    
    case 'AO':
      // Placeholder: 923 456 789
      if (clean.length >= 9) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`
      }
      if (clean.length > 6) {
        return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
      }
      if (clean.length > 3) {
        return `${clean.slice(0, 3)} ${clean.slice(3)}`
      }
      return clean
    
    case 'MZ':
      // Placeholder: 84 123 4567
      if (clean.length >= 9) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 9)}`
      }
      if (clean.length > 5) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`
      }
      if (clean.length > 2) {
        return `${clean.slice(0, 2)} ${clean.slice(2)}`
      }
      return clean
    
    default:
      // Formato genérico: primeiros 4 dígitos + espaço + resto
      if (clean.length > 4) {
        return `${clean.slice(0, 4)} ${clean.slice(4)}`
      }
      return clean
  }
}

// ==================== ENDEREÇO ====================

export interface PostalCodeFormat {
  mask: string
  example: string
  minLength: number
  maxLength: number
}

export function getPostalCodeFormat(country: string): PostalCodeFormat {
  const formats: Record<string, PostalCodeFormat> = {
    BR: { mask: '99999-999', example: '01310-100', minLength: 8, maxLength: 9 },
    US: { mask: '99999', example: '12345', minLength: 5, maxLength: 10 },
    CA: { mask: 'A9A 9A9', example: 'K1A 0B1', minLength: 6, maxLength: 7 },
    AR: { mask: '9999', example: '1234', minLength: 4, maxLength: 8 },
    PT: { mask: '9999-999', example: '1000-001', minLength: 7, maxLength: 8 },
    ES: { mask: '99999', example: '28001', minLength: 5, maxLength: 5 },
    MX: { mask: '99999', example: '01000', minLength: 5, maxLength: 5 },
    CO: { mask: '999999', example: '110111', minLength: 6, maxLength: 6 },
    CL: { mask: '9999999', example: '8320000', minLength: 7, maxLength: 7 },
    UY: { mask: '99999', example: '11000', minLength: 5, maxLength: 5 },
    PY: { mask: '9999', example: '1234', minLength: 4, maxLength: 4 },
    BO: { mask: '9999', example: '0000', minLength: 4, maxLength: 4 },
  }

  return formats[country] || { mask: '', example: '', minLength: 4, maxLength: 10 }
}

export function validatePostalCode(postalCode: string, country: string): boolean {
  // Validação especial para código postal canadense (formato A1A 1A1)
  if (country === 'CA') {
    const clean = postalCode.replace(/\s/g, '').toUpperCase()
    // Formato: letra, dígito, letra, espaço, dígito, letra, dígito
    const canadianPostalCodeRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/
    return clean.length === 6 && canadianPostalCodeRegex.test(clean)
  }
  
  const clean = postalCode.replace(/\D/g, '')
  const format = getPostalCodeFormat(country)
  
  return clean.length >= format.minLength && clean.length <= format.maxLength
}

export function formatPostalCode(postalCode: string, country: string): string {
  // Para o Canadá, o código postal usa formato alfanumérico A1A 1A1
  if (country === 'CA') {
    const clean = postalCode.replace(/\s/g, '').toUpperCase()
    if (clean.length <= 3) return clean
    if (clean.length <= 6) {
      return `${clean.slice(0, 3)} ${clean.slice(3)}`
    }
    return clean
  }
  
  const clean = postalCode.replace(/\D/g, '')
  
  switch (country) {
    case 'BR':
      if (clean.length <= 5) return clean
      return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`
    
    case 'PT':
      if (clean.length <= 4) return clean
      return `${clean.slice(0, 4)}-${clean.slice(4, 7)}`
    
    default:
      return clean
  }
}

// Estados/Províncias por país
export function getStatesOrProvinces(country: string): Array<{ code: string; name: string }> {
  const statesByCountry: Record<string, Array<{ code: string; name: string }>> = {
    BR: [
      { code: 'AC', name: 'Acre' },
      { code: 'AL', name: 'Alagoas' },
      { code: 'AP', name: 'Amapá' },
      { code: 'AM', name: 'Amazonas' },
      { code: 'BA', name: 'Bahia' },
      { code: 'CE', name: 'Ceará' },
      { code: 'DF', name: 'Distrito Federal' },
      { code: 'ES', name: 'Espírito Santo' },
      { code: 'GO', name: 'Goiás' },
      { code: 'MA', name: 'Maranhão' },
      { code: 'MT', name: 'Mato Grosso' },
      { code: 'MS', name: 'Mato Grosso do Sul' },
      { code: 'MG', name: 'Minas Gerais' },
      { code: 'PA', name: 'Pará' },
      { code: 'PB', name: 'Paraíba' },
      { code: 'PR', name: 'Paraná' },
      { code: 'PE', name: 'Pernambuco' },
      { code: 'PI', name: 'Piauí' },
      { code: 'RJ', name: 'Rio de Janeiro' },
      { code: 'RN', name: 'Rio Grande do Norte' },
      { code: 'RS', name: 'Rio Grande do Sul' },
      { code: 'RO', name: 'Rondônia' },
      { code: 'RR', name: 'Roraima' },
      { code: 'SC', name: 'Santa Catarina' },
      { code: 'SP', name: 'São Paulo' },
      { code: 'SE', name: 'Sergipe' },
      { code: 'TO', name: 'Tocantins' }
    ],
    US: [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      // ... adicionar todos os estados se necessário
    ]
  }

  return statesByCountry[country] || []
}




