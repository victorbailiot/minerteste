/**
 * Utilitários para o Sistema de Pagamento Solidário
 */

import { prisma } from './prisma'

/**
 * Gera um código único para voucher no formato MINER-XXXX-YYYY
 */
export const generateVoucherCode = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code: string
  let exists = true

  while (exists) {
    // Gera duas partes de 4 caracteres cada
    const part1 = Array.from({ length: 4 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    
    const part2 = Array.from({ length: 4 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    code = `MINER-${part1}-${part2}`

    // Verifica se já existe
    const existing = await prisma.paymentVoucher.findUnique({
      where: { code }
    })

    exists = !!existing
  }

  return code!
}

/**
 * Formata informações do voucher para exibição
 */
export const formatVoucherInfo = (voucher: {
  code: string
  amount: number
  packageName?: string
  beneficiaryName?: string
  expiresAt: Date
  status: string
}) => {
  return {
    code: voucher.code,
    amount: voucher.amount,
    packageName: voucher.packageName || 'Pacote',
    beneficiaryName: voucher.beneficiaryName || 'Usuário',
    expiresAt: voucher.expiresAt,
    status: voucher.status,
    isExpired: new Date() > voucher.expiresAt,
    isValid: voucher.status === 'PENDING' && new Date() <= voucher.expiresAt
  }
}

/**
 * Valida se um voucher pode ser usado
 */
export const validateVoucher = (voucher: {
  status: string
  expiresAt: Date
  payerId?: bigint | null
}) => {
  const now = new Date()
  
  if (voucher.status !== 'PENDING') {
    return {
      valid: false,
      error: 'Este voucher já foi utilizado ou cancelado'
    }
  }

  if (now > voucher.expiresAt) {
    return {
      valid: false,
      error: 'Este voucher expirou'
    }
  }

  if (voucher.payerId) {
    return {
      valid: false,
      error: 'Este voucher já possui um pagador'
    }
  }

  return { valid: true }
}

