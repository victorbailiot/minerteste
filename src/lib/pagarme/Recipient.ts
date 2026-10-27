export interface Recipient {
  id: string
  name: string
  email: string
  document: string
  type: 'individual' | 'company'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  default_bank_account: {
    id: string
    holder_name: string
    holder_type: string
    holder_document: string
    bank: string
    branch_number: string
    branch_check_digit: string
    account_number: string
    account_check_digit: string
    type: 'checking' | 'savings'
    status: 'active' | 'inactive'
    created_at: string
    updated_at: string
    metadata: Record<string, any>
  }
  gateway_recipients: Array<{
    gateway: string
    status: string
    pgid: string
    created_at: string
    updated_at: string
  }>
  metadata: Record<string, any>
  automatic_anticipation_settings: {
    enabled: boolean
    type: 'full' | 'automatic'
    volume_percentage: number
    delay: number
    days: number[]
  }
  transfer_settings: {
    transfer_enabled: boolean
    transfer_interval: 'daily' | 'weekly' | 'monthly'
    transfer_day: number
    transfer_enabled_at: string
  }
}
