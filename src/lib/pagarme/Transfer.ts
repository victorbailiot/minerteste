export interface Transfer {
  id: string
  amount: number
  status: 'pending_transfer' | 'transferred' | 'failed' | 'canceled' | 'processing'
  created_at: string
  updated_at: string
  bank_account: {
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
  metadata: Record<string, any>
  fee: number
  funding_date: string
  funding_estimated_date: string
  type: 'ted' | 'doc' | 'pix'
  source_type: 'recipient' | 'anticipation' | 'chargeback' | 'refund'
  source_id: string
  target_id: string
  target_type: 'recipient'
  transaction_id: string
}
