export interface Order {
    id: string
    code: string
    amount: number
    currency: string
    closed: boolean
    items: Array<{
        id: string
        amount: number
        created_at: string
        description: string
        quantity: number
        status: string
        updated_at: string
    }>
    customer: {
        id: string
        name: string
        email: string
        document: string
        type: string
        delinquent: boolean
        created_at: string
        updated_at: string
        phones: {
            home_phone: {
                country_code: string
                number: string
                area_code: string
            }
        }
        metadata: Record<string, any>
    }
    status: 'pending' | 'processing' | 'authorized' | 'paid' | 'refused' | 'refunded' | 'chargedback' | 'analyzing' | 'pending_review'
    created_at: string
    updated_at: string
    closed_at: string
    charges: Array<{
        id: string
        code: string
        gateway_id: string
        amount: number
        paid_amount: number
        status: string
        currency: string
        payment_method: string
        paid_at: string
        created_at: string
        updated_at: string
        pending_cancellation: boolean
        customer: {
            id: string
            name: string
            email: string
            document: string
            type: string
            delinquent: boolean
            created_at: string
            updated_at: string
            phones: {
                home_phone: {
                    country_code: string
                    number: string
                    area_code: string
                }
            }
            metadata: Record<string, any>
        }
        last_transaction: {
            transaction_type: string
            pix_provider_tid: string
            qr_code: string
            qr_code_url: string
            expires_at: string
            id: string
            gateway_id: string
            amount: number
            status: string
            success: boolean
            created_at: string
            updated_at: string
            gateway_response: Record<string, any>
            antifraud_response: Record<string, any>
            metadata: Record<string, any>
        }
        metadata: Record<string, string>
    }>
    metadata: Record<string, string>
}