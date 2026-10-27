/**
 * Utilitários compartilhados para transferências Bradesco
 */

import type { PayeeSummaryForPixAudit } from '@/lib/admin-audit'
import type { BradescoEnvironment } from './config'
import type { PixPayer } from './types'

/** Telefone usado nos exemplos Postman Bradesco; em produção não corresponde à conta do certificado mTLS. */
const DEMO_PHONE_DIGITS = '5511912345678'

/**
 * Em produção, bloqueia o pagador com o telefone de exemplo da doc (evita HTTP 500 genérico no gateway).
 */
export const getBradescoPagadorProductionIssue = (
  environment: BradescoEnvironment,
  pagador: PixPayer
): string | null => {
  if (environment !== 'production') return null
  if (pagador.tipoChave !== 'TELEFONE') return null
  const digits = pagador.chavePix.replace(/\D/g, '')
  if (digits === DEMO_PHONE_DIGITS) {
    return (
      'Em produção, BRADESCO_PAGADOR_CHAVE_PIX não pode ser o telefone de exemplo +5511912345678 da documentação Bradesco. ' +
      'Configure a chave Pix (telefone, e-mail ou EVP) ou use BRADESCO_PAGADOR_TIPO_CHAVE=AGENCIACONTA com agência e conta da empresa vinculadas ao certificado.'
    )
  }
  return null
}

export const BANK_CODE_TO_ISPB: Record<string, string> = {
  '001': '00000000', '003': '04902979', '004': '07237373', '033': '90400888',
  '041': '92702067', '047': '13009717', '070': '00000000', '069': '61033106',
  '077': '00416968', '097': '00714671', '099': '01701201', '104': '00360305',
  '121': '10664513', '133': '10398952', '136': '00315557', '197': '16501555', '208': '30306294',
  '212': '92894922', '218': '71027866', '237': '60746948', '243': '27652684',
  '260': '18236120', '290': '08561701', '318': '71371686', '323': '10573521',
  '336': '31872495', '341': '60701190', '380': '22896431', '389': '17184037',
  '422': '58160789', '505': '59588111', '633': '68900810', '643': '00122327',
  '707': '01023570', '735': '08357240', '741': '04831810', '745': '33479023',
  '748': '01181521', '756': '02038232', '769': '50579044', '777': '17298092',
  '810': '00204963', '840': '00775603',
}

export const mapAccountType = (type: string): 'CONTA_CORRENTE' | 'CONTA_POUPANCA' =>
  type === 'savings' ? 'CONTA_POUPANCA' : 'CONTA_CORRENTE'

/** Mapeia PixKeyType do sistema para tipo do lote (EMAIL, CPF, CNPJ, TELEFONE, ALEATORIA) */
export const mapPixKeyTypeToLote = (
  type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
): 'EMAIL' | 'CPF' | 'CNPJ' | 'TELEFONE' | 'ALEATORIA' => {
  switch (type) {
    case 'CPF': return 'CPF'
    case 'CNPJ': return 'CNPJ'
    case 'EMAIL': return 'EMAIL'
    case 'PHONE': return 'TELEFONE'
    case 'RANDOM': return 'ALEATORIA'
  }
}

export const sanitizePixKey = (key: string, type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'): string => {
  if (type === 'PHONE') {
    const digits = key.replace(/\D/g, '')
    if (digits.length <= 11) return `+55${digits}`
    if (!digits.startsWith('55')) return `+55${digits}`
    return `+${digits}`
  }
  if (type === 'CPF' || type === 'CNPJ') return key.replace(/\D/g, '')
  return key
}

/** Conta bancária / PIX ainda visíveis no perfil (não removidos pelo usuário). */
export function getActiveBankAndPix<
  B extends { excludedAt?: Date | null } | null,
  P extends { excludedAt?: Date | null } | null,
>(bankAccount: B, pixKey: P): { bankAccount: B | null; pixKey: P | null } {
  return {
    bankAccount: bankAccount && !bankAccount.excludedAt ? bankAccount : null,
    pixKey: pixKey && !pixKey.excludedAt ? pixKey : null,
  }
}

/** Resumo do favorecido para auditoria (mesmo formato usado na resposta da API de transferência). */
export function buildPayeeSummaryForAudit(user: {
  name: string | null
  bankAccount: ({
    excludedAt?: Date | null
    holderName: string
    branchNumber: string
    accountNumber: string
    accountCheckDigit: string
    bankName: string | null
    bankCode: string
  }) | null
  pixKey: ({
    excludedAt?: Date | null
    pixKey: string
    pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
    accountHolderName: string | null
  }) | null
}): PayeeSummaryForPixAudit | null {
  const { bankAccount, pixKey } = getActiveBankAndPix(user.bankAccount, user.pixKey)
  if (bankAccount) {
    const b = bankAccount
    return {
      nome: b.holderName,
      metodo: 'Agência + Conta',
      detalhe: `Ag. ${b.branchNumber} · Conta ${b.accountNumber}-${b.accountCheckDigit} (${b.bankName ?? b.bankCode})`,
    }
  }
  if (pixKey) {
    const chave = sanitizePixKey(pixKey.pixKey, pixKey.pixKeyType)
    return {
      nome: pixKey.accountHolderName || user.name || '—',
      metodo: `Chave PIX (${pixKey.pixKeyType})`,
      detalhe: chave,
    }
  }
  return null
}
