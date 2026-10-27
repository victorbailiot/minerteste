import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import bcrypt from 'bcryptjs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function setupBigIntSerialization() {
  // Verificar se BigInt.prototype.toJSON já foi definido para evitar redefinição
  if (!(BigInt.prototype as any).toJSON) {
    // Definir método toJSON para BigInt que retorna a representação em string
    Object.defineProperty(BigInt.prototype, 'toJSON', {
      value: function() {
        return this.toString();
      },
      configurable: true,
      writable: true
    });
  }
  
  // Verificar se estamos em um ambiente onde podemos modificar JSON.stringify
  if (typeof JSON !== 'undefined') {
    // Salvar a implementação original
    const originalStringify = JSON.stringify;
    
    // Substituir JSON.stringify com uma versão que lida com BigInt
    (JSON as any).stringify = function(value: any, replacer?: (key: string, value: any) => any, space?: string | number) {
      // Criar um replacer personalizado que converte BigInt para string
      const bigintReplacer = (key: string, val: any) => {
        // Se o valor for BigInt, converter para string
        if (typeof val === 'bigint') {
          return val.toString();
        }
        
        // Se um replacer foi fornecido (deve ser função; pode ser array), usá-lo
        if (typeof replacer === 'function') {
          return replacer(key, val);
        }
        
        // Caso contrário, retornar o valor original
        return val;
      };
      
      // Chamar o stringify original com nosso replacer personalizado
      return originalStringify(value, bigintReplacer, space);
    };
  }
}

const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmail.com.br': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail,com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotail.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'outllok.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'otulook.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahho.com': 'yahoo.com',
}

const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'temp-mail.org',
  'throwaway.email',
  'getnada.com',
  'maildrop.cc',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
]

const VALID_EMAIL_EXTENSIONS = [
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'br', 'co', 'uk', 'de', 'fr', 'it', 'es', 'pt',
  'jp', 'cn', 'ru', 'ca', 'au', 'in', 'mx', 'ar', 'cl', 'pe', 've', 'ec', 'bo', 'py', 'uy', 'gy',
  'sr', 'gf', 'fk', 'io', 'me', 'info', 'biz', 'name', 'pro', 'aero', 'coop', 'museum', 'travel',
  'jobs', 'mobi', 'tel', 'asia', 'cat', 'post', 'xxx'
]

const POPULAR_EMAIL_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'globo.com',
  'proton.me',
]

const getLevenshteinDistance = (source: string, target: string): number => {
  if (source === target) return 0
  if (!source.length) return target.length
  if (!target.length) return source.length

  const matrix = Array.from({ length: source.length + 1 }, () =>
    Array.from({ length: target.length + 1 }, () => 0)
  )

  for (let row = 0; row <= source.length; row += 1) {
    matrix[row][0] = row
  }

  for (let column = 0; column <= target.length; column += 1) {
    matrix[0][column] = column
  }

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      const cost = source[row - 1] === target[column - 1] ? 0 : 1

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      )
    }
  }

  return matrix[source.length][target.length]
}

const getSuggestedPopularEmailDomain = (domain: string): string | undefined => {
  let bestMatch: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY

  for (const popularDomain of POPULAR_EMAIL_DOMAINS) {
    const distance = getLevenshteinDistance(domain, popularDomain)

    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = popularDomain
    }
  }

  if (!bestMatch) {
    return undefined
  }

  return bestDistance <= 2 ? bestMatch : undefined
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmailWithDetails(email: string): {
  isValid: boolean
  normalizedEmail: string
  error?: string
  suggestion?: string
  warning?: string
} {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'Digite seu email',
    }
  }

  if (normalizedEmail.includes(' ')) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'O email não pode conter espaços',
    }
  }

  if ((normalizedEmail.match(/@/g) || []).length !== 1) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'Digite um email válido',
    }
  }

  const [localPart, domainPart] = normalizedEmail.split('@')

  if (!localPart || !domainPart) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'Digite um email válido',
    }
  }

  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    normalizedEmail.includes('..')
  ) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'Digite um email válido',
    }
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
  if (!emailRegex.test(normalizedEmail)) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'Digite um email válido',
    }
  }

  if (domainPart.includes(',')) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'O domínio do email parece inválido',
    }
  }

  const correctedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domainPart]
  if (correctedDomain) {
    return {
      isValid: false,
      normalizedEmail,
      error: `O domínio "${domainPart}" parece incorreto. Você quis dizer "${correctedDomain}"?`,
      suggestion: `${localPart}@${correctedDomain}`,
    }
  }

  const suggestedPopularDomain = getSuggestedPopularEmailDomain(domainPart)
  if (suggestedPopularDomain && suggestedPopularDomain !== domainPart) {
    return {
      isValid: false,
      normalizedEmail,
      error: `O domínio "${domainPart}" parece ter sido digitado errado.`,
      suggestion: `${localPart}@${suggestedPopularDomain}`,
    }
  }

  const domainLabels = domainPart.split('.')
  if (
    domainLabels.length < 2 ||
    domainLabels.some((label) => !label || label.startsWith('-') || label.endsWith('-'))
  ) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'O domínio do email parece inválido',
    }
  }

  const extension = domainLabels[domainLabels.length - 1]
  if (!VALID_EMAIL_EXTENSIONS.includes(extension)) {
    const suggestionByExtension =
      extension === 'con' || extension === 'cim' || extension === 'cm'
        ? `${localPart}@${domainPart.replace(/\.[^.]+$/, '.com')}`
        : undefined

    return {
      isValid: false,
      normalizedEmail,
      error: suggestionByExtension
        ? 'O final do email parece incorreto. Verifique se deveria terminar com ".com".'
        : 'O domínio do email parece inválido',
      suggestion: suggestionByExtension,
    }
  }

  if (DISPOSABLE_EMAIL_DOMAINS.includes(domainPart)) {
    return {
      isValid: false,
      normalizedEmail,
      error: 'Emails temporários não são aceitos',
    }
  }

  return {
    isValid: true,
    normalizedEmail,
    warning: POPULAR_EMAIL_DOMAINS.includes(domainPart)
      ? undefined
      : 'Confira com atenção se o domínio está correto, principalmente se não for um email pessoal conhecido.',
  }
}

/**
 * Valida se um email tem formato válido
 */
export function isValidEmail(email: string): boolean {
  return validateEmailWithDetails(email).isValid
}

/**
 * Valida se um email é real (formato + domínio válido)
 */
export async function isValidRealEmail(email: string): Promise<boolean> {
  return validateEmailWithDetails(email).isValid
}

/**
 * Gera hash da senha usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Formata número de telefone brasileiro
 */
export function formatPhone(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '')
  
  // Se tem 11 dígitos, formata como (XX) 9XXXX-XXXX
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  
  // Se tem 10 dígitos, formata como (XX) XXXX-XXXX
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  // Se não tem formato padrão, retorna como está
  return phone
}

/**
 * Gera string aleatória para IDs únicos
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Gera código de indicação único de 6 caracteres (apenas números)
 */
export function generateReferralCode(): string {
  const chars = '0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Gera código de indicação único garantindo que não existe no banco
 */
export async function generateUniqueReferralCode(prisma: any): Promise<string> {
  let code: string
  let exists: boolean
  
  do {
    code = generateReferralCode()
    exists = await prisma.user.findUnique({
      where: { referralCode: code }
    }) !== null
  } while (exists)
  
  return code
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/** Labels em pt-BR para status de pagamento da loja (StorePaymentStatus) */
export const STORE_PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Pago', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Falhou', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
}

/**
 * Retorna o label em português do status de pagamento da loja.
 * Uso: exibição em cards, listagens e badges.
 */
export function formatStorePaymentStatus(status: string): string {
  return STORE_PAYMENT_STATUS_LABELS[status]?.label ?? status
}

/**
 * Converte BigInt para Number de forma segura
 */
export function bigIntToNumber(value: bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return Number(value)
}

/**
 * Valida um CPF brasileiro
 * @param cpf - CPF a ser validado (com ou sem máscara)
 * @returns true se o CPF for válido, false caso contrário
 */
export function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return false
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(cleanCPF.charAt(9)) !== digit1) {
    return false
  }
  
  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(cleanCPF.charAt(10)) !== digit2) {
    return false
  }
  
  return true
}

/**
 * Formata um CPF com máscara (999.999.999-99)
 * @param cpf - CPF sem formatação
 * @returns CPF formatado
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '')
  
  if (cleanCPF.length <= 3) {
    return cleanCPF
  } else if (cleanCPF.length <= 6) {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3)}`
  } else if (cleanCPF.length <= 9) {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6)}`
  } else {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9, 11)}`
  }
}

/**
 * Valida se telefone tem formato válido
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 11
}

/**
 * Serializa dados que podem conter BigInt para JSON
 */
export function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => 
      typeof value === 'bigint' ? Number(value) : value
    )
  )
}


/**
 * Formata telefone para o padrão exigido pelo PagarMe
 * Suporta ambos os formatos:
 * - Novo (internacional): +55 91980276218
 * - Antigo (nacional): (91) 98027-6218
 */
export const formatPhoneForPagarMe = (phone: string | null) => {
  if (!phone) return { area_code: '11', number: '999999999' }
  
  // Verifica se é formato internacional (começa com +)
  if (phone.startsWith('+')) {
    // Remove o + e todos os espaços
    const cleanPhone = phone.replace(/[+\s]/g, '')
    
    // Verifica se é número brasileiro (+55)
    if (cleanPhone.startsWith('55')) {
      // Remove o código do país (55)
      const nationalNumber = cleanPhone.substring(2)
      
      // Extrair código de área (primeiros 2 dígitos após o 55)
      const areaCode = nationalNumber.substring(0, 2)
      
      // Extrair número (restante após o DDD)
      const number = nationalNumber.substring(2)
      
      return { area_code: areaCode, number: number }
    } else {
      // Para números internacionais não brasileiros
      // Usar código de área padrão e o número completo sem código do país
      const countryCodeLength = cleanPhone.startsWith('1') ? 1 : 2
      const numberWithoutCountry = cleanPhone.substring(countryCodeLength)
      
      return { 
        area_code: numberWithoutCountry.substring(0, 2) || '11', 
        number: numberWithoutCountry.substring(2) || '999999999' 
      }
    }
  } else {
    // Formato antigo: (XX) XXXXX-XXXX
    // Remover todos os caracteres especiais: (, ), -, espaços
    const cleanPhone = phone.replace(/[()\-\s]/g, '')
    
    // Extrair código de área (primeiros 2 dígitos)
    const areaCode = cleanPhone.substring(0, 2)
    
    // Extrair número (restante)
    const number = cleanPhone.substring(2)
    
    return { area_code: areaCode, number: number }
  }
}
