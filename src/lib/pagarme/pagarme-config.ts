/**
 * Configurações e constantes da Pagar.me
 * Centralizadas para uso em frontend e backend
 */

// ===== TABELA DE JUROS =====

/**
 * Tabela de juros aplicados por parcela
 * Percentuais aplicados sobre o valor total
 * 
 * IMPORTANTE: Estes são os juros cobrados DO CLIENTE
 * A Pagar.me cobra taxas de processamento (4,69% a 17,50%) DO LOJISTA
 * Esta tabela já considera margem para cobrir essas taxas
 * 
 * Baseado em: Modo Parcelado Pagar.me (taxas promocionais)
 */
export const PAGARME_INTEREST_TABLE: { [key: number]: number } = {
  1: 0.0488,      // 5%
  2: 0.0619,     // 6,5%
  3: 0.0885,      // 10%
  4: 0.1022,     // 11,5%
  5: 0.1158,      // 13%
  6: 0.1295,     // 14,5%
  7: 0.1430,      // 16%
  8: 0.1616,     // 17,5%
  9: 0.1752,      // 19%
  10: 0.1890,    // 20,5%
  11: 0.2029,     // 22%
  12: 0.2173     // 23,5%
}

/**
 * Número máximo de parcelas padrão
 */
export const MAX_INSTALLMENTS = 3

/**
 * Número máximo de parcelas para casos especiais
 */
export const MAX_INSTALLMENTS_SPECIAL = 12

// ===== FUNÇÕES DE CÁLCULO =====

/**
 * Calcular o número máximo de parcelas permitido baseado nas regras de negócio.
 *
 * O limite base vem do campo `maxInstallments` do pacote (configurável no banco de dados).
 * Para pacotes de baixo valor com compras múltiplas, o limite é progressivo:
 * - 1 unidade: usa o padrão MAX_INSTALLMENTS
 * - 2–3 unidades: até 5x
 * - 4–6 unidades: até 8x
 * - 7+ unidades: até o máximo configurado no pacote
 *
 * @param packageMaxInstallments Máximo de parcelas configurado no pacote (Package.maxInstallments)
 * @param quantity Quantidade de pacotes comprados
 * @param packagePrice Preço unitário (usado apenas para cálculo de limite progressivo)
 * @returns Número máximo de parcelas permitido
 */
export function calculateMaxInstallments(
  packageMaxInstallments: number,
  quantity: number,
  packagePrice?: number
): number {
  if (packageMaxInstallments <= 1) {
    return 1
  }

  // Para compras de pequeno valor (preço < R$ 200), aplicar limite progressivo por quantidade
  if (packagePrice !== undefined && packagePrice < 200) {
    if (quantity === 1) return Math.min(MAX_INSTALLMENTS, packageMaxInstallments)
    if (quantity >= 2 && quantity <= 3) return Math.min(5, packageMaxInstallments)
    if (quantity >= 4 && quantity <= 6) return Math.min(8, packageMaxInstallments)
  }

  return packageMaxInstallments
}

/**
 * Calcular valor total com juros
 * @param baseAmount Valor base em reais (valor que o cliente quer receber)
 * @param installments Número de parcelas
 * @returns Valor total com juros aplicados (valor que deve ser cobrado)
 */
export function calculateTotalWithInterest(
  baseAmount: number,
  installments: number
): number {
  const interestRate = PAGARME_INTEREST_TABLE[installments] || 0
  
  // Cálculo correto: taxa é aplicada sobre o valor total a ser cobrado
  // Se taxa = 21,6% do valor total, então: valor_cobrado = valor_receber / (1 - taxa)
  if (interestRate > 0) {
    return baseAmount / (1 - interestRate)
  }
  
  return baseAmount
}

/**
 * Calcular valor de cada parcela
 * @param baseAmount Valor base em reais
 * @param installments Número de parcelas
 * @returns Valor de cada parcela
 */
export function calculateInstallmentAmount(
  baseAmount: number,
  installments: number
): number {
  const totalWithInterest = calculateTotalWithInterest(baseAmount, installments)
  return totalWithInterest / installments
}

/**
 * Obter taxa de juros para número de parcelas
 * @param installments Número de parcelas
 * @returns Taxa de juros (0 a 1)
 */
export function getInterestRate(installments: number): number {
  return PAGARME_INTEREST_TABLE[installments] || 0
}

/**
 * Verificar se parcela tem juros
 * @param installments Número de parcelas
 * @returns true se tem juros, false se não
 */
export function hasInterest(installments: number): boolean {
  const rate = getInterestRate(installments)
  return rate > 0
}

/**
 * Obter taxa de juros em percentual
 * @param installments Número de parcelas
 * @returns Taxa de juros em percentual (ex: 4.79)
 */
export function getInterestRatePercent(installments: number): number {
  return Math.round(getInterestRate(installments) * 10000) / 100
}

/**
 * Tipo para opção de parcelamento
 */
export interface InstallmentOption {
  installment: number
  installmentAmount: number
  totalAmount: number
  hasInterest: boolean
  interestRate: number
  interestRateDecimal: number
}

/**
 * Gerar todas as opções de parcelamento
 * @param baseAmount Valor base em reais
 * @param maxInstallments Número máximo de parcelas (padrão: 3)
 * @returns Array com todas as opções de parcelamento
 */
export function generateInstallmentOptions(
  baseAmount: number,
  maxInstallments: number = MAX_INSTALLMENTS
): InstallmentOption[] {
  const options: InstallmentOption[] = []

  for (let i = 1; i <= maxInstallments; i++) {
    const interestRate = getInterestRate(i)
    const total = calculateTotalWithInterest(baseAmount, i)
    const installmentAmount = total / i
    const interest = hasInterest(i)

    options.push({
      installment: i,
      installmentAmount: Math.round(installmentAmount * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
      hasInterest: interest,
      interestRate: getInterestRatePercent(i),
      interestRateDecimal: interestRate
    })
  }

  return options
}

// ===== FORMATAÇÃO =====

/**
 * Formatar label da parcela
 * @param installmentNumber Número da parcela
 * @param installmentAmount Valor de cada parcela
 * @returns Label formatado (ex: "1x de R$ 1.047,75 (juros 4.79%)")
 */
export function formatInstallmentLabel(
  installmentNumber: number,
  installmentAmount: number
): string {
  const interestRate = getInterestRate(installmentNumber)
  const hasInterestFlag = hasInterest(installmentNumber)

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(installmentAmount)

  if (hasInterestFlag) {
    return `${installmentNumber}x de ${formatted}`
  } else {
    return `${installmentNumber}x de ${formatted}`
  }
}

