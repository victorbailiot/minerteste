/**
 * Utilitários para cálculo de dias úteis
 * Usado especificamente para o Clube dos 300 - Cashback Pioneiro
 */

/**
 * Verifica se uma data é um dia útil (segunda a sexta, excluindo feriados)
 * @param date Data a ser verificada
 * @returns true se for dia útil, false caso contrário
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay()
  
  // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false
  }
  
  // Verificar se é feriado nacional brasileiro
  return !isBrazilianHoliday(date)
}

/**
 * Calcula o número de dias úteis no mês especificado
 * @param year Ano
 * @param month Mês (1-12)
 * @returns Número de dias úteis no mês
 */
export function getBusinessDaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0) // Último dia do mês
  
  let businessDays = 0
  const currentDate = new Date(firstDay)
  
  while (currentDate <= lastDay) {
    if (isBusinessDay(currentDate)) {
      businessDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return businessDays
}

/**
 * Calcula o número de dias úteis no mês atual
 * @returns Número de dias úteis no mês atual
 */
export function getCurrentMonthBusinessDays(): number {
  const now = new Date()
  return getBusinessDaysInMonth(now.getFullYear(), now.getMonth() + 1)
}

/**
 * Verifica se é um feriado nacional brasileiro
 * Lista básica de feriados fixos e alguns móveis
 * @param date Data a ser verificada
 * @returns true se for feriado, false caso contrário
 */
function isBrazilianHoliday(date: Date): boolean {
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()
  const year = date.getFullYear()
  
  // Feriados fixos
  const fixedHolidays = [
    { month: 1, day: 1 },   // Ano Novo
    { month: 4, day: 21 },  // Tiradentes
    { month: 5, day: 1 },   // Dia do Trabalhador
    { month: 9, day: 7 },   // Independência do Brasil
    { month: 10, day: 12 }, // Nossa Senhora Aparecida
    { month: 11, day: 2 },  // Finados
    { month: 11, day: 15 }, // Proclamação da República
    { month: 12, day: 25 }  // Natal
  ]
  
  // Verificar feriados fixos
  for (const holiday of fixedHolidays) {
    if (month === holiday.month && day === holiday.day) {
      return true
    }
  }
  
  // Feriados móveis (Páscoa e derivados) - cálculo simplificado
  const easterDate = getEasterDate(year)
  
  // Sexta-feira Santa (2 dias antes da Páscoa)
  const goodFriday = new Date(easterDate)
  goodFriday.setDate(easterDate.getDate() - 2)
  
  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(easterDate)
  corpusChristi.setDate(easterDate.getDate() + 60)
  
  const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  const goodFridayString = `${goodFriday.getFullYear()}-${(goodFriday.getMonth() + 1).toString().padStart(2, '0')}-${goodFriday.getDate().toString().padStart(2, '0')}`
  const corpusChristiString = `${corpusChristi.getFullYear()}-${(corpusChristi.getMonth() + 1).toString().padStart(2, '0')}-${corpusChristi.getDate().toString().padStart(2, '0')}`
  
  return dateString === goodFridayString || dateString === corpusChristiString
}

/**
 * Calcula a data da Páscoa para um ano específico
 * Usando o algoritmo de Gauss
 * @param year Ano
 * @returns Data da Páscoa
 */
function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = Math.floor((h + l - 7 * m + 114) / 31)
  const p = (h + l - 7 * m + 114) % 31
  
  return new Date(year, n - 1, p + 1)
}

/**
 * Verifica se hoje é um dia útil
 * @returns true se hoje for dia útil, false caso contrário
 */
export function isTodayBusinessDay(): boolean {
  return isBusinessDay(new Date())
}

/**
 * Calcula o valor diário do cashback baseado no pacote e dias úteis do mês
 * @param packagePrice Valor do pacote
 * @param cashbackPercent Percentual de cashback (2.5 para 2.5% ou 6 para 6%)
 * @param businessDays Número de dias úteis do mês (opcional, usa o mês atual se não fornecido)
 * @returns Valor diário do cashback
 */
export function calculateDailyCashback(
  packagePrice: number,
  cashbackPercent: number,
  businessDays?: number
): number {
  const totalBusinessDays = businessDays || getCurrentMonthBusinessDays()
  const monthlyAmount = packagePrice * (cashbackPercent / 100)
  return monthlyAmount / totalBusinessDays
}
