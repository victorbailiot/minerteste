/**
 * Tradutor de status do recebedor Pagar.me para português
 * Baseado na documentação oficial dos status de recebedor
 */

export type RecipientStatus = 
  | 'registration' 
  | 'affiliation' 
  | 'active' 
  | 'refused' 
  | 'suspended' 
  | 'blocked' 
  | 'inactive'

export interface RecipientStatusInfo {
  label: string
  description: string
  canTransact: boolean
  canWithdraw: boolean
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  icon: string
}

/**
 * Mapeamento completo dos status do recebedor
 */
export const recipientStatusMap: Record<RecipientStatus, RecipientStatusInfo> = {
  registration: {
    label: 'Registro',
    description: 'Você já passou pelo pré-credenciamento e está com o auto credenciamento pendente. Neste momento você não pode realizar saques.',
    canTransact: true,
    canWithdraw: false,
    color: 'blue',
    icon: '📝'
  },
  affiliation: {
    label: 'Afiliação',
    description: 'Você já passou pelo auto credenciamento e está esperando a afiliação. Você ainda não pode realizar saques. Clique no botão "Validar Conta" para continuar.',
    canTransact: true,
    canWithdraw: false,
    color: 'yellow',
    icon: '⏳'
  },
  active: {
    label: 'Ativo',
    description: 'Parabéns! Você já passou por todos os estágios do credenciamento e está apto a realizar saques.',
    canTransact: true,
    canWithdraw: true,
    color: 'green',
    icon: '✅'
  },
  refused: {
    label: 'Recusado',
    description: 'Seu credenciamento foi recusado no pré-credenciamento ou na afiliação. Neste momento você não está apto a realizar transações e saques.',
    canTransact: false,
    canWithdraw: false,
    color: 'red',
    icon: '❌'
  },
  suspended: {
    label: 'Suspenso',
    description: 'Você não se auto credenciou após o período estabelecido, ou teve pendências no estágio de afiliação. Neste momento você não está apto a realizar transações e saques.',
    canTransact: false,
    canWithdraw: false,
    color: 'red',
    icon: '⏸️'
  },
  blocked: {
    label: 'Bloqueado',
    description: 'Após estar ativo, foi detectado comportamento suspeito em sua conta. Neste momento você não está apto a realizar transações e saques.',
    canTransact: false,
    canWithdraw: false,
    color: 'red',
    icon: '🚫'
  },
  inactive: {
    label: 'Inativo',
    description: 'Após ser monitorado, foi comprovado comportamento suspeito em sua conta. Neste momento você não está apto a realizar transações e saques.',
    canTransact: false,
    canWithdraw: false,
    color: 'gray',
    icon: '💤'
  }
}

/**
 * Traduz o status do recebedor para português
 * @param status - Status em inglês do Pagar.me
 * @returns Objeto com informações traduzidas do status
 */
export const translateRecipientStatus = (status: string): RecipientStatusInfo => {
  const normalizedStatus = status.toLowerCase() as RecipientStatus
  
  // Se o status existe no mapeamento, retorna as informações
  if (recipientStatusMap[normalizedStatus]) {
    return recipientStatusMap[normalizedStatus]
  }
  
  // Fallback para status não mapeados
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    description: 'Status não identificado',
    canTransact: false,
    canWithdraw: false,
    color: 'gray',
    icon: '❓'
  }
}

/**
 * Retorna apenas o label traduzido do status
 * @param status - Status em inglês do Pagar.me
 * @returns Label em português
 */
export const getRecipientStatusLabel = (status: string): string => {
  return translateRecipientStatus(status).label
}

/**
 * Retorna as classes CSS do Tailwind para o status
 * @param status - Status em inglês do Pagar.me
 * @returns Classes CSS para cores
 */
export const getRecipientStatusClasses = (status: string): string => {
  const statusInfo = translateRecipientStatus(status)
  
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  return colorClasses[statusInfo.color]
}

/**
 * Verifica se o recebedor pode realizar transações
 * @param status - Status em inglês do Pagar.me
 * @returns true se pode transacionar
 */
export const canTransact = (status: string): boolean => {
  return translateRecipientStatus(status).canTransact
}

/**
 * Verifica se o recebedor pode realizar saques
 * @param status - Status em inglês do Pagar.me
 * @returns true se pode sacar
 */
export const canWithdraw = (status: string): boolean => {
  return translateRecipientStatus(status).canWithdraw
}

/**
 * Retorna todos os status disponíveis
 * @returns Array com todos os status mapeados
 */
export const getAllRecipientStatuses = (): RecipientStatus[] => {
  return Object.keys(recipientStatusMap) as RecipientStatus[]
}
