'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateInstallmentOptions, formatInstallmentLabel, calculateMaxInstallments, MAX_INSTALLMENTS_SPECIAL, type InstallmentOption } from '@/lib/pagarme/pagarme-config'
import CpfPhoneModal from '../CpfPhoneModal'

interface PagarMeCardPaymentModalLojaProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId?: string) => void
  orderId: string
  orderNumber: string
  total: number
  maxInstallments?: number
  user?: {
    id?: string
    name?: string
    email?: string
    cpf?: string
    documentNumber?: string
    phone?: string
    country?: string
  }
}

interface CardData {
  number: string
  holderName: string
  expMonth: string
  expYear: string
  cvv: string
}

interface BillingAddress {
  zipCode: string
  street: string
  number: string
  neighborhood?: string
  city: string
  state: string
}

const PagarMeCardPaymentModalLoja: React.FC<PagarMeCardPaymentModalLojaProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  orderNumber,
  total,
  maxInstallments: packageMaxInstallments = MAX_INSTALLMENTS_SPECIAL,
  user
}) => {
  const { user: authUser } = useAuth()
  const finalUser = user || authUser

  const [isProcessing, setIsProcessing] = useState(false)
  const [installments, setInstallments] = useState<number>(1)
  const [installmentsOptions, setInstallmentsOptions] = useState<InstallmentOption[]>([])
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    holderName: '',
    expMonth: '',
    expYear: '',
    cvv: ''
  })
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [maxInstallments, setMaxInstallments] = useState(3)
  
  const [showCpfPhoneModal, setShowCpfPhoneModal] = useState(false)
  const [additionalCpf, setAdditionalCpf] = useState<string>('')
  const [additionalPhone, setAdditionalPhone] = useState<string>('')

  useEffect(() => {
    const maxInstallmentsCalculated = calculateMaxInstallments(packageMaxInstallments, 1)
    setMaxInstallments(maxInstallmentsCalculated)
  }, [total])

  useEffect(() => {
    if (total > 0) {
      const options = generateInstallmentOptions(total, maxInstallments)
      setInstallmentsOptions(options)
    }
  }, [total, maxInstallments])

  useEffect(() => {
    if (isOpen) {
      console.log('📥 Carregando script Pagar.me...')
      
      const existingScript = document.querySelector('script[src*="tokenizecard.js"]')
      if (existingScript) {
        console.log('✅ Script Pagar.me já carregado')
        return
      }
      
      if ((window as any).PagarmeCheckout) {
        console.log('✅ PagarmeCheckout já disponível')
        return
      }
      
      const originalConsoleError = console.error
      console.error = (...args) => {
        const message = args.join(' ')
        if (message.includes('babel-polyfill')) {
          console.warn('⚠️ Babel-polyfill conflict ignorado:', ...args)
          return
        }
        originalConsoleError.apply(console, args)
      }
      
      const script = document.createElement('script')
      script.src = 'https://checkout.pagar.me/v1/tokenizecard.js'
      script.setAttribute('data-pagarmecheckout-app-id', process.env.NEXT_PUBLIC_PAGARME_KEY_PUBLIC || '')
      script.async = true
      script.id = 'pagarme-tokenizecard-script'
      
      script.onload = () => {
        console.error = originalConsoleError
        console.log('✅ Script Pagar.me carregado com sucesso')
      }
      
      script.onerror = (error) => {
        console.error = originalConsoleError
        console.error('❌ Erro ao carregar script Pagar.me:', error)
        setError('Erro ao carregar sistema de pagamento. Verifique sua conexão.')
      }
      
      document.head.appendChild(script)
      
      return () => {
        console.error = originalConsoleError
        const scriptToRemove = document.querySelector('#pagarme-tokenizecard-script')
        if (scriptToRemove) {
          document.head.removeChild(scriptToRemove)
        }
      }
    }
  }, [isOpen])

  const getSelectedInstallment = () => {
    return installmentsOptions.find(opt => opt.installment === installments)
  }

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    
    if (cleanCep.length !== 8) {
      return
    }

    setIsLoadingCep(true)
    try {
      const response = await fetch(`/api/cep?cep=${cleanCep}`)
      const result = await response.json()

      if (result.success) {
        const { street, city, state, neighborhood } = result.data
        setBillingAddress(prev => ({
          ...prev,
          street: street || prev.street,
          city: city || prev.city,
          state: state || prev.state,
          neighborhood: neighborhood || prev.neighborhood
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    } finally {
      setIsLoadingCep(false)
    }
  }

  const formatCardNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    const matches = numbers.match(/.{1,4}/g)
    return matches ? matches.join(' ') : numbers
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount)
  }

  const detectCardBrand = (cardNumber: string): string => {
    const number = cardNumber.replace(/\D/g, '')
    
    if (/^4/.test(number)) return 'Visa'
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'Mastercard'
    if (/^3[47]/.test(number)) return 'Amex'
    if (/^(4011|4312|4389|4514|4576|5041|5066|5067|6277|6362|6363|6504|6505|6516)/.test(number)) return 'Elo'
    if (/^(38|60)/.test(number)) return 'Hipercard'
    if (/^3(?:0[0-5]|[68][0-9])[0-9]{11}$/.test(number)) return 'Diners'
    if (/^6(?:011|5[0-9]{2})/.test(number)) return 'Discover'
    
    return 'Mastercard'
  }

  const validateCard = (): boolean => {
    if (cardData.number.replace(/\D/g, '').length < 13) {
      setError('Número do cartão inválido')
      return false
    }

    if (!cardData.holderName || cardData.holderName.length < 3) {
      setError('Nome do titular inválido')
      return false
    }

    if (!cardData.expMonth || !cardData.expYear) {
      setError('Data de validade inválida')
      return false
    }

    if (cardData.cvv.length < 3) {
      setError('CVV inválido')
      return false
    }

    if (!billingAddress.zipCode || billingAddress.zipCode.replace(/\D/g, '').length !== 8) {
      setError('CEP inválido')
      return false
    }

    if (!billingAddress.street || billingAddress.street.length < 3) {
      setError('Endereço inválido')
      return false
    }

    if (!billingAddress.number) {
      setError('Número do endereço é obrigatório')
      return false
    }

    if (!billingAddress.city || billingAddress.city.length < 3) {
      setError('Cidade inválida')
      return false
    }

    if (!billingAddress.state || billingAddress.state.length !== 2) {
      setError('Estado inválido (use sigla: SP, RJ, etc)')
      return false
    }

    return true
  }

  const needsCpfPhone = (): boolean => {
    if (!finalUser?.cpf || !finalUser?.phone) {
      return true
    }
    
    if (finalUser?.country && finalUser.country !== 'BR') {
      return true
    }
    
    return false
  }

  const handleCpfPhoneSubmit = (data: { cpf: string; phone: string }) => {
    console.log('📋 Dados coletados do modal:', data)
    setAdditionalCpf(data.cpf)
    setAdditionalPhone(data.phone)
    setShowCpfPhoneModal(false)
    processPayment(data.cpf, data.phone)
  }

  const processPayment = async (cpf?: string, phone?: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      console.log('💳 Processando pagamento com cartão para pedido:', orderNumber)

      const finalCpf = cpf || finalUser?.cpf || finalUser?.documentNumber || ''
      const finalPhone = phone || finalUser?.phone || ''

      const requestBody = {
        orderId,
        orderNumber,
        amount: total,
        installments,
        cardData: {
          number: cardData.number.replace(/\s/g, ''),
          holderName: cardData.holderName,
          holderDocument: finalCpf,
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvv: cardData.cvv,
          brand: detectCardBrand(cardData.number)
        },
        billingAddress: {
          zipCode: billingAddress.zipCode.replace(/\D/g, ''),
          street: billingAddress.street,
          number: billingAddress.number,
          complement: '',
          neighborhood: billingAddress.neighborhood,
          city: billingAddress.city,
          state: billingAddress.state.toUpperCase()
        },
        customerData: {
          name: finalUser?.name || '',
          email: finalUser?.email || '',
          document: finalCpf,
          phone: finalPhone
        },
        metadata: {
          tipo_compra: 'loja',
          order_id: orderId,
          order_number: orderNumber,
          user_id: finalUser?.id?.toString() || ''
        }
      }

      console.log('📦 Enviando dados para API...')

      const response = await fetch('/api/store/payments/charge-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }

      toast.success('Pagamento processado com sucesso!')
      onSuccess(result.data.paymentId)
      onClose()

    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error)
      const errorMessage = error.message || 'Erro ao processar pagamento. Tente novamente.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!validateCard()) {
      return
    }

    if (needsCpfPhone()) {
      console.log('🌍 Abrindo modal para coletar CPF/Telefone...')
      setShowCpfPhoneModal(true)
      return
    }

    processPayment()
  }

  const generateYearOptions = (): string[] => {
    const currentYear = new Date().getFullYear()
    const years: string[] = []
    for (let i = 0; i < 15; i++) {
      years.push((currentYear + i).toString())
    }
    return years
  }

  return (
    <>
      <CpfPhoneModal
        isOpen={showCpfPhoneModal}
        onClose={() => setShowCpfPhoneModal(false)}
        onSubmit={handleCpfPhoneSubmit}
        initialCpf={additionalCpf}
        initialPhone={additionalPhone}
      />

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pagamento com Cartão de Crédito
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber} - Preencha os dados do cartão para finalizar o pagamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" data-pagarmecheckout-form>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pedido:</span>
              <span className="text-sm font-medium">#{orderNumber}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-base font-semibold">Total:</span>
                <span className="text-base font-semibold text-green-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installments">
              Número de Parcelas
            </Label>
            <Select
              value={installments.toString()}
              onValueChange={(value) => setInstallments(Number(value))}
              disabled={isProcessing || installmentsOptions.length === 0}
            >
              <SelectTrigger id="installments">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {installmentsOptions.map((option) => (
                  <SelectItem key={option.installment} value={option.installment.toString()}>
                    {formatInstallmentLabel(option.installment, option.installmentAmount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {installments > 1 && getSelectedInstallment() && (
              <p className="text-xs text-gray-500">
                Total parcelado: {formatCurrency(getSelectedInstallment()!.totalAmount)}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Endereço de Cobrança</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <div className="relative">
                  <Input
                    id="zipCode"
                    type="text"
                    placeholder="00000-000"
                    maxLength={9}
                    value={billingAddress.zipCode}
                    onChange={(e) => {
                      const formatted = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2')
                      setBillingAddress({ ...billingAddress, zipCode: formatted })
                      
                      if (formatted.replace(/\D/g, '').length === 8) {
                        fetchAddressByCep(formatted)
                      }
                    }}
                    required
                    disabled={isProcessing}
                  />
                  {isLoadingCep && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    </div>
                  )}
                </div>
                {billingAddress.zipCode && billingAddress.zipCode.replace(/\D/g, '').length === 8 && (
                  <p className="text-xs text-green-600">
                    ✓ Endereço preenchido automaticamente
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="SP"
                  maxLength={2}
                  value={billingAddress.state}
                  onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value.toUpperCase() })}
                  required
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                type="text"
                placeholder="São Paulo"
                value={billingAddress.city}
                onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                required
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                type="text"
                placeholder="Centro"
                value={billingAddress.neighborhood}
                onChange={(e) => setBillingAddress({ ...billingAddress, neighborhood: e.target.value })}
                disabled={isProcessing}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Rua/Avenida</Label>
                <Input
                  id="street"
                  type="text"
                  placeholder="Rua Exemplo"
                  value={billingAddress.street}
                  onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                  required
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  type="text"
                  placeholder="123"
                  value={billingAddress.number}
                  onChange={(e) => setBillingAddress({ ...billingAddress, number: e.target.value })}
                  required
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-700">Dados do Cartão</h3>
            
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Número do Cartão</Label>
              <Input
                id="cardNumber"
                name="card-number"
                type="text"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                value={formatCardNumber(cardData.number)}
                onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                data-pagarmecheckout-element="number"
                required
                disabled={isProcessing}
              />
              <span data-pagarmecheckout-element="brand" className="text-sm text-gray-500"></span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holderName">Nome do Titular</Label>
              <Input
                id="holderName"
                name="holder-name"
                type="text"
                placeholder="Nome como está no cartão"
                value={cardData.holderName}
                onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                data-pagarmecheckout-element="holder_name"
                required
                disabled={isProcessing}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expMonth">Mês</Label>
                <Input
                  id="expMonth"
                  name="exp-month"
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  value={cardData.expMonth}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '').slice(0, 2)
                    
                    if (value.length === 2) {
                      const month = parseInt(value)
                      if (month > 12 || month < 1) {
                        value = value[0]
                      }
                    }
                    
                    setCardData({ ...cardData, expMonth: value })
                  }}
                  onBlur={(e) => {
                    let value = e.target.value.replace(/\D/g, '').slice(0, 2)
                    if (value.length === 1 && parseInt(value) > 0 && parseInt(value) <= 9) {
                      value = value.padStart(2, '0')
                      setCardData({ ...cardData, expMonth: value })
                    }
                  }}
                  data-pagarmecheckout-element="exp_month"
                  required
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expYear">Ano</Label>
                <Input
                  id="expYear"
                  name="exp-year"
                  type="text"
                  placeholder="YYYY"
                  maxLength={4}
                  value={cardData.expYear}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    
                    if (value.length === 4) {
                      const year = parseInt(value)
                      const currentYear = new Date().getFullYear()
                      if (year < currentYear) {
                        value = value.slice(0, 3)
                      }
                    }
                    
                    setCardData({ ...cardData, expYear: value })
                  }}
                  data-pagarmecheckout-element="exp_year"
                  required
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  name="cvv"
                  type="text"
                  placeholder="123"
                  maxLength={4}
                  value={cardData.cvv}
                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                  data-pagarmecheckout-element="cvv"
                  required
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-900">
                <p className="font-medium mb-1">Pagamento Seguro</p>
                <p>Seus dados são protegidos com criptografia de ponta a ponta. Não armazenamos informações do cartão.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Pagar {formatCurrency(getSelectedInstallment()?.totalAmount ?? total)}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}

export default PagarMeCardPaymentModalLoja