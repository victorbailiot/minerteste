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
import CpfPhoneModal from './CpfPhoneModal'

// ===== TIPOS =====

interface PagarMeCardPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId?: string) => void
  packageId: string
  packageName: string
  packagePrice: number
  quantity: number
  currency: string
  minerId: string
  packageMaxInstallments?: number
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


// ===== COMPONENTE =====

const PagarMeCardPaymentModal: React.FC<PagarMeCardPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  packageId,
  packageName,
  packagePrice,
  quantity,
  currency,
  minerId,
  packageMaxInstallments = MAX_INSTALLMENTS_SPECIAL
}) => {
  const { user } = useAuth()

  // Estados
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
  const [cardToken, setCardToken] = useState<string | null>(null)
  const [isTokenizing, setIsTokenizing] = useState(false)
  const [maxInstallments, setMaxInstallments] = useState(3)
  
  // Estados para modal de CPF/Telefone
  const [showCpfPhoneModal, setShowCpfPhoneModal] = useState(false)
  const [additionalCpf, setAdditionalCpf] = useState<string>('')
  const [additionalPhone, setAdditionalPhone] = useState<string>('')


  // Calcular valor total
  const totalAmount = packagePrice * quantity

  // Calcular o número máximo de parcelas baseado nas regras de negócio
  useEffect(() => {
    const maxInstallmentsCalculated = calculateMaxInstallments(packageMaxInstallments, quantity, packagePrice)
    setMaxInstallments(maxInstallmentsCalculated)
  }, [packageMaxInstallments, packagePrice, quantity])

  // Calcular opções de parcelamento localmente
  useEffect(() => {
    if (totalAmount > 0) {
      const options = generateInstallmentOptions(totalAmount, maxInstallments)
      setInstallmentsOptions(options)
    }
  }, [totalAmount, maxInstallments])

  
  // Carregar script do Pagar.me quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      console.log('📥 Carregando script Pagar.me...')
      
      // Verificar se já existe
      const existingScript = document.querySelector('script[src*="tokenizecard.js"]')
      if (existingScript) {
        console.log('✅ Script Pagar.me já carregado')
        return
      }
      
      // Verificar se já temos o PagarmeCheckout disponível
      if ((window as any).PagarmeCheckout) {
        console.log('✅ PagarmeCheckout já disponível')
        return
      }
      
      // Tentar suprimir o erro do babel-polyfill temporariamente
      const originalConsoleError = console.error
      console.error = (...args) => {
        const message = args.join(' ')
        if (message.includes('babel-polyfill')) {
          console.warn('⚠️ Babel-polyfill conflict ignorado:', ...args)
          return
        }
        originalConsoleError.apply(console, args)
      }
      
      // Carregar script
      const script = document.createElement('script')
      script.src = 'https://checkout.pagar.me/v1/tokenizecard.js'
      script.setAttribute('data-pagarmecheckout-app-id', process.env.NEXT_PUBLIC_PAGARME_KEY_PUBLIC || '')
      script.async = true
      script.id = 'pagarme-tokenizecard-script'
      
      script.onload = () => {
        // Restaurar console.error
        console.error = originalConsoleError
        
        console.log('✅ Script Pagar.me carregado com sucesso')
        console.log('🔍 PagarmeCheckout disponível:', !!(window as any).PagarmeCheckout)
        
        // Verificar se o objeto foi criado corretamente
        if ((window as any).PagarmeCheckout) {
          console.log('🔧 Métodos disponíveis:', Object.keys((window as any).PagarmeCheckout))
          console.log('🔧 Tipo do init:', typeof (window as any).PagarmeCheckout.init)
        } else {
          console.error('❌ PagarmeCheckout não foi criado após carregar o script')
        }
      }
      
      script.onerror = (error) => {
        // Restaurar console.error
        console.error = originalConsoleError
        
        console.error('❌ Erro ao carregar script Pagar.me:', error)
        setError('Erro ao carregar sistema de pagamento. Verifique sua conexão.')
      }
      
      document.head.appendChild(script)
      
      return () => {
        // Restaurar console.error se ainda estiver sobrescrito
        console.error = originalConsoleError
        
        // Limpar script quando modal fechar
        const scriptToRemove = document.querySelector('#pagarme-tokenizecard-script')
        if (scriptToRemove) {
          document.head.removeChild(scriptToRemove)
        }
      }
    }
  }, [isOpen])

  // Obter opção de parcelamento selecionada
  const getSelectedInstallment = () => {
    return installmentsOptions.find(opt => opt.installment === installments)
  }

  // Buscar dados do endereço pelo CEP
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

  // Tokenizar cartão usando Pagar.me - Versão simplificada sem conflitos
  const tokenizeCard = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      setIsTokenizing(true)
      
      // Timeout para evitar travamento (10 segundos)
      const timeoutId = setTimeout(() => {
        console.error('⏰ Timeout na tokenização do cartão')
        setError('Timeout: processo de tokenização demorou muito para responder')
        setIsTokenizing(false)
        resolve(null)
      }, 10000)
      
      // Função de sucesso
      const success = (data: any) => {
        console.log('✅ Cartão tokenizado com sucesso:', data)
        clearTimeout(timeoutId)
        setCardToken(data.pagarmetoken)
        setIsTokenizing(false)
        resolve(data.pagarmetoken)
      }
      
      // Função de erro
      const fail = (error: any) => {
        console.error('❌ Erro ao tokenizar cartão:', error)
        clearTimeout(timeoutId)
        setError(`Erro ao processar dados do cartão: ${error.message || 'Erro desconhecido'}`)
        setIsTokenizing(false)
        resolve(null)
      }
      
      // Verificar se a chave pública está configurada
      const publicKey = process.env.NEXT_PUBLIC_PAGARME_KEY_PUBLIC
      if (!publicKey) {
        console.error('❌ Chave pública Pagar.me não configurada')
        setError('Erro de configuração: chave pública não encontrada')
        setIsTokenizing(false)
        resolve(null)
        return
      }
      
      console.log('🔑 Chave pública configurada:', publicKey.substring(0, 10) + '...')
      
      // Verificar se o Pagar.me Checkout está carregado
      if (typeof window !== 'undefined' && (window as any).PagarmeCheckout) {
        console.log('🚀 PagarmeCheckout disponível, iniciando tokenização...')
        
        try {
          console.log('🔧 Chamando PagarmeCheckout.init...')
          
          // Tentar tokenização diretamente
          ;(window as any).PagarmeCheckout.init(success, fail)
          console.log('✅ PagarmeCheckout.init chamado com sucesso')
          
        } catch (error) {
          console.error('❌ Erro ao chamar PagarmeCheckout.init:', error)
          setError(`Erro ao inicializar tokenização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
          setIsTokenizing(false)
          resolve(null)
        }
      } else {
        console.error('❌ PagarmeCheckout não disponível')
        setError('Sistema de pagamento não carregado. Recarregue a página.')
        setIsTokenizing(false)
        resolve(null)
      }
    })
  }

  // Tokenizar via API (v5) – usa nosso endpoint que chama appId na query string
  const tokenizeViaApi = async (): Promise<string | null> => {
    setIsTokenizing(true)
    setError(null)
    try {
      const payload = {
        cardData: {
          number: cardData.number.replace(/\s/g, ''),
          holderName: cardData.holderName,
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvv: cardData.cvv
        }
      }
      const resp = await fetch('/api/pagarme/tokenize-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await resp.json()
      if (!resp.ok || !json.success || !json.data?.token) {
        console.error('Falha na tokenização via API:', json)
        setError(json.error || 'Falha na tokenização via API')
        return null
      }
      setCardToken(json.data.token)
      return json.data.token as string
    } catch (e: any) {
      console.error('Erro ao tokenizar via API:', e)
      setError('Erro ao tokenizar via API')
      return null
    } finally {
      setIsTokenizing(false)
    }
  }

  // Formatar número do cartão
  const formatCardNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    const matches = numbers.match(/.{1,4}/g)
    return matches ? matches.join(' ') : numbers
  }

  // Formatar moeda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount)
  }

  // Detectar bandeira do cartão
  const detectCardBrand = (cardNumber: string): string => {
    const number = cardNumber.replace(/\D/g, '')
    
    // Visa
    if (/^4/.test(number)) return 'Visa'
    
    // Mastercard
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'Mastercard'
    
    // American Express
    if (/^3[47]/.test(number)) return 'Amex'
    
    // Elo
    if (/^(4011|4312|4389|4514|4576|5041|5066|5067|6277|6362|6363|6504|6505|6516)/.test(number)) return 'Elo'
    
    // Hipercard
    if (/^(38|60)/.test(number)) return 'Hipercard'
    
    // Diners Club
    if (/^3(?:0[0-5]|[68][0-9])[0-9]{11}$/.test(number)) return 'Diners'
    
    // Discover
    if (/^6(?:011|5[0-9]{2})/.test(number)) return 'Discover'
    
    return 'Mastercard' // Default
  }

  // Validar cartão e endereço
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

    // Validar endereço
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

  // Verificar se precisa coletar CPF/Telefone
  const needsCpfPhone = (): boolean => {
    // Se não tiver CPF ou telefone cadastrado, precisa coletar
    if (!user?.cpf || !user?.phone) {
      return true
    }
    
    // Se não for Brasil, precisa coletar CPF e telefone brasileiros
    if (user?.country && user.country !== 'BR') {
      return true
    }
    
    return false
  }

  // Handler para coletar CPF/Telefone
  const handleCpfPhoneSubmit = (data: { cpf: string; phone: string }) => {
    console.log('📋 Dados coletados do modal:', data)
    setAdditionalCpf(data.cpf)
    setAdditionalPhone(data.phone)
    setShowCpfPhoneModal(false)
    
    // Processar pagamento após coletar dados
    processPayment(data.cpf, data.phone)
  }

  // Processar pagamento
  const processPayment = async (cpf?: string, phone?: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      console.log('💳 Processando pagamento com cartão...')

      // Usar CPF coletado do modal ou do usuário
      const finalCpf = cpf || user?.cpf || ''
      const finalPhone = phone || user?.phone || ''

      // Preparar dados para a API (novo formato)
      const requestBody = {
        packageId,
        minerId,
        quantity,
        currency,
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
          complement: '', // Pode adicionar um campo no formulário se necessário
          neighborhood: billingAddress.neighborhood,
          city: billingAddress.city,
          state: billingAddress.state.toUpperCase()
        },
        customerData: {
          name: user?.name || '',
          email: user?.email || '',
          document: finalCpf,
          phone: finalPhone
        }
      }

      console.log('📦 Enviando dados para API...')
      console.log('🌍 País do usuário:', user?.country)
      console.log('📄 CPF enviado:', finalCpf)
      console.log('📞 Telefone enviado:', finalPhone)

      const response = await fetch('/api/pagarme/charge-card', {
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

  // Processar pagamento (handler do form)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!validateCard()) {
      return
    }

    // Verificar se precisa coletar CPF/Telefone
    if (needsCpfPhone()) {
      console.log('🌍 Usuário não é do Brasil. Abrindo modal para coletar CPF/Telefone...')
      setShowCpfPhoneModal(true)
      return
    }

    // Processar pagamento diretamente
    processPayment()
  }

  // Gerar opções de anos (próximos 15 anos)
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
      {/* Modal de CPF/Telefone para usuários internacionais */}
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
            Preencha os dados do cartão para finalizar o pagamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" data-pagarmecheckout-form>
          {/* Resumo do Pedido */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pacote:</span>
              <span className="text-sm font-medium">{packageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Quantidade:</span>
              <span className="text-sm font-medium">{quantity}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Valor Unitário:</span>
              <span className="text-sm font-medium">{formatCurrency(packagePrice)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-base font-semibold">Total:</span>
                <span className="text-base font-semibold text-green-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Seleção de Parcelas */}
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

          {/* Endereço de Cobrança */}
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
                      
                      // Buscar endereço quando CEP estiver completo
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

          {/* Dados do Cartão */}
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
                    
                    // Validar mês (01-12)
                    if (value.length === 2) {
                      const month = parseInt(value)
                      if (month > 12 || month < 1) {
                        // Se for inválido, manter apenas o primeiro dígito
                        value = value[0]
                      }
                    }
                    
                    setCardData({ ...cardData, expMonth: value })
                  }}
                  onBlur={(e) => {
                    // Adicionar zero à esquerda apenas quando sair do campo
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
                    
                    // Validar ano (mínimo ano atual)
                    if (value.length === 4) {
                      const year = parseInt(value)
                      const currentYear = new Date().getFullYear()
                      if (year < currentYear) {
                        // Se for menor que o ano atual, manter apenas os primeiros dígitos
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

          {/* Mensagem de Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Informações de Segurança */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-900">
                <p className="font-medium mb-1">Pagamento Seguro</p>
                <p>Seus dados são protegidos com criptografia de ponta a ponta. Não armazenamos informações do cartão.</p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
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
              disabled={isProcessing || isTokenizing}
              className="flex-1"
            >
              {isProcessing || isTokenizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Pagar {formatCurrency(getSelectedInstallment()?.totalAmount ?? totalAmount)}
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

export default PagarMeCardPaymentModal

