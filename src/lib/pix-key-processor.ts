/**
 * Processa a chave PIX antes de enviar para a API OpenPix
 * Remove caracteres especiais para CPF, CNPJ e telefone
 * Adiciona código do país (55) para telefones
 * Mantém email e chave aleatória inalterados
 */

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'

export function processPixKeyForOpenPix(pixKeyType: PixKeyType, pixKey: string): string {
  // Para EMAIL e RANDOM, retorna a chave inalterada
  if (pixKeyType === 'EMAIL' || pixKeyType === 'RANDOM') {
    return pixKey
  }

  // Para CPF, CNPJ e PHONE, remove todos os caracteres especiais
  let processedKey = pixKey.replace(/[^\d]/g, '')

  // Para PHONE, adiciona código do país (55) no início
  if (pixKeyType === 'PHONE') {
    // Se já começa com 55, não adiciona novamente
    if (!processedKey.startsWith('55')) {
      processedKey = `55${processedKey}`
    }
  }

  return processedKey
}

/**
 * Valida se a chave PIX está no formato correto após processamento
 */
export function validateProcessedPixKey(pixKeyType: PixKeyType, processedKey: string): boolean {
  switch (pixKeyType) {
    case 'CPF':
      return /^\d{11}$/.test(processedKey)
    case 'CNPJ':
      return /^\d{14}$/.test(processedKey)
    case 'EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(processedKey)
    case 'PHONE':
      // Deve ter 12-13 dígitos (55 + DDD + número)
      return /^\d{12,13}$/.test(processedKey)
    case 'RANDOM':
      return processedKey.length >= 32
    default:
      return false
  }
}

/**
 * Função completa que processa e valida a chave PIX
 * Retorna a chave processada ou null se inválida
 */
export function processAndValidatePixKey(pixKeyType: PixKeyType, pixKey: string): string | null {
  const processedKey = processPixKeyForOpenPix(pixKeyType, pixKey)
  
  if (validateProcessedPixKey(pixKeyType, processedKey)) {
    return processedKey
  }
  
  return null
} 