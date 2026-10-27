export interface Usage {
  id: string
  quantity: number
  description: string
  used_at: string
  created_at: string
  status: 'active' | 'inactive'
  code: string
  group: string
  amount: number
  subscription: {
    id: string
    code: string
    status: 'active' | 'inactive' | 'canceled' | 'expired'
    created_at: string
    updated_at: string
    current_cycle: {
      id: string
      start_at: string
      end_at: string
      billing_at: string
    }
  }
  item: {
    id: string
    name: string
    description: string
    status: 'active' | 'inactive'
    pricing_scheme: {
      scheme_type: 'per_unit' | 'tiered' | 'volume'
      price: number
      minimum_price: number
      starting_at: number
      ending_at: number
    }
  }
  metadata: Record<string, any>
}
