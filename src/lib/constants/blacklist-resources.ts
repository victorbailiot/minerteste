export interface BlacklistAction {
  key: string
  label: string
}

export interface BlacklistResource {
  key: string
  label: string
  actions: BlacklistAction[]
}

export const BLACKLIST_RESOURCES: Record<string, BlacklistResource> = {
  USERS: {
    key: 'users',
    label: 'Usuários',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Criar' },
      { key: 'update', label: 'Editar' },
      { key: 'delete', label: 'Deletar' }
    ]
  },
  TRANSACTIONS: {
    key: 'transactions',
    label: 'Transações',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Criar' },
      { key: 'update', label: 'Editar' },
      { key: 'delete', label: 'Deletar' }
    ]
  },
  WITHDRAWALS: {
    key: 'withdrawals',
    label: 'Saques',
    actions: [
      { key: 'request', label: 'Solicitar' },
      { key: 'cancel', label: 'Cancelar' },
      { key: 'view', label: 'Visualizar' }
    ]
  },
  NETWORK: {
    key: 'network',
    label: 'Rede/Indicações',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'invite', label: 'Convidar' }
    ]
  },
  PACKAGES: {
    key: 'packages',
    label: 'Pacotes',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'purchase', label: 'Comprar' },
      { key: 'activate', label: 'Ativar' }
    ]
  },
  DASHBOARD: {
    key: 'dashboard',
    label: 'Dashboard',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'access', label: 'Acessar' }
    ]
  },
  ADMIN: {
    key: 'admin',
    label: 'Área Admin',
    actions: [
      { key: 'access', label: 'Acessar' },
      { key: 'manage', label: 'Gerenciar' }
    ]
  },
  BONUS: {
    key: 'bonus',
    label: 'Bônus',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'receive', label: 'Receber' },
      { key: 'transfer', label: 'Transferência de bônus' }
    ]
  },
  CASHBACK: {
    key: 'cashback',
    label: 'Receber cashback',
    actions: [
      { key: 'receive', label: 'Receber' }
    ]
  },
  PROFITS: {
    key: 'profits',
    label: 'Divisão de Lucros',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'receive', label: 'Receber' }
    ]
  },
  CONTRACTS: {
    key: 'contracts',
    label: 'Contratos',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'sign', label: 'Assinar' }
    ]
  },
  SUPPORT: {
    key: 'support',
    label: 'Suporte',
    actions: [
      { key: 'create', label: 'Criar Ticket' },
      { key: 'view', label: 'Visualizar Tickets' },
      { key: 'reply', label: 'Responder' }
    ]
  },
  PAY_PACKAGE_BONUS: {
    key: 'pay_package_bonus',
    label: 'Pagamento de pacotes com saldo bônus',
    actions: [
      { key: 'pay', label: 'Pagar' }
    ]
  },
  PAY_PACKAGE_MINER_CREDIT: {
    key: 'pay_package_miner_credit',
    label: 'Pagamento de pacotes com crédito minerador',
    actions: [
      { key: 'pay', label: 'Pagar' }
    ]
  }
}

export const getAllResources = (): BlacklistResource[] => {
  return Object.values(BLACKLIST_RESOURCES)
}

export const getResourceByKey = (key: string): BlacklistResource | undefined => {
  return getAllResources().find(r => r.key === key)
}

export const getActionLabel = (resourceKey: string, actionKey: string): string => {
  const resource = getResourceByKey(resourceKey)
  if (!resource) return actionKey
  
  const action = resource.actions.find(a => a.key === actionKey)
  return action?.label || actionKey
}

/** Opção plana para multi-select: cada item = um (resource, action) com label único */
export interface BlacklistOption {
  resource: string
  action: string | null
  label: string
}

/** Retorna lista plana de opções para marcar vários recursos na blacklist */
export const getFlatBlacklistOptions = (): BlacklistOption[] => {
  const options: BlacklistOption[] = []
  for (const res of getAllResources()) {
    if (res.actions.length === 0) {
      options.push({ resource: res.key, action: null, label: res.label })
    } else {
      for (const act of res.actions) {
        let label: string
        if (res.key === 'bonus' && act.key === 'transfer') {
          label = 'Não pode fazer transferência de bônus'
        } else if (res.actions.length === 1 && act.key === 'receive') {
          label = res.label
        } else {
          label = `${res.label} – ${act.label}`
        }
        options.push({ resource: res.key, action: act.key, label })
      }
    }
  }
  return options
}
