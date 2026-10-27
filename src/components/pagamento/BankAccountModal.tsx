'use client'

import React, { useState, useEffect } from 'react'
import { X, User, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'

interface ExistingBankAccount {
  bankCode: string
  branchNumber: string
  branchCheckDigit?: string
  accountNumber: string
  accountCheckDigit: string
  accountType: 'checking' | 'savings'
  holderName: string
  holderType: 'individual' | 'company'
  holderDocument: string
  recipientName: string
  recipientEmail: string
  recipientDocument: string
  recipientType: 'individual' | 'company'
}

interface BankAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: ExistingBankAccount | null
}

interface FormData {
  // Dados do recebedor
  name: string
  email: string
  document: string
  type: 'individual' | 'company'
  
  // Dados da conta bancária
  bankCode: string
  branchNumber: string
  branchCheckDigit: string
  accountNumber: string
  accountCheckDigit: string
  accountType: 'checking' | 'savings'
  holderName: string
  holderType: 'individual' | 'company'
  holderDocument: string
}

const BANKS = {
  "001": "Banco do Brasil S.A.",
  "003": "Banco da Amazônia S.A.",
  "004": "Banco do Nordeste do Brasil S.A.",
  "007": "Banco Nacional de Desenvolvimento Econômico e Social - BNDES",
  "012": "Banco Inbursa S.A.",
  "014": "State Street Brasil S.A. - Banco Comercial",
  "017": "BNY Mellon Banco S.A.",
  "018": "Banco Tricury S.A.",
  "021": "BANESTES S.A. Banco do Estado do Espírito Santo",
  "024": "Banco BANDEPE S.A.",
  "025": "Banco Alfa S.A.",
  "029": "Banco Itaú Consignado S.A.",
  "033": "Banco Santander (Brasil) S.A.",
  "036": "Banco Bradesco BBI S.A.",
  "037": "Banco do Estado do Pará S.A.",
  "040": "Banco Cargill S.A.",
  "041": "Banco do Estado do Rio Grande do Sul S.A.",
  "047": "Banco do Estado de Sergipe S.A.",
  "062": "Hipercard Banco Múltiplo S.A.",
  "063": "Banco Bradescard S.A.",
  "064": "Goldman Sachs do Brasil Banco Múltiplo S.A.",
  "065": "Banco Andbank (Brasil) S.A.",
  "066": "Banco Morgan Stanley S.A.",
  "069": "Banco Crefisa S.A.",
  "070": "BRB - Banco de Brasília S.A.",
  "074": "Banco J. Safra S.A.",
  "075": "Banco ABN AMRO S.A.",
  "076": "Banco KDB S.A.",
  "077": "Banco Inter S.A.",
  "078": "Haitong Banco de Investimento do Brasil S.A.",
  "079": "Banco Original do Agronegócio S.A.",
  "081": "BancoSeguro S.A.",
  "082": "Banco Topázio S.A.",
  "083": "Banco da China Brasil S.A.",
  "085": "Cooperativa Central de Crédito - AILOS",
  "092": "Brickell S.A. Crédito, Financiamento e Investimento",
  "094": "Banco Finaxis S.A.",
  "095": "Banco Travelex S.A.",
  "096": "Banco B3 S.A.",
  "097": "Cooperativa Central de Crédito Noroeste Brasileiro Ltda.",
  "104": "Caixa Econômica Federal",
  "107": "Banco BOCOM BBM S.A.",
  "119": "Banco Western Union do Brasil S.A.",
  "121": "Banco Agibank S.A.",
  "122": "Banco Bradesco BERJ S.A.",
  "124": "Banco Woori Bank do Brasil S.A.",
  "125": "Banco Genial S.A.",
  "126": "BR Partners Banco de Investimento S.A.",
  "128": "Braza Bank S.A. Banco de Câmbio",
  "129": "UBS Brasil Banco de Investimento S.A.",
  "132": "ICBC do Brasil Banco Múltiplo S.A.",
  "133": "Cresol - Confederação Nacional das Cooperativas Centrais de Crédito e Economia Familiar e Solidária",
  "136": "Unicred do Brasil - Confederação Nacional das Cooperativas Centrais Unicred LTDA",
  "139": "Intesa Sanpaolo Brasil S.A. - Banco Múltiplo",
  "144": "Ebury Banco de Câmbio S.A.",
  "159": "Casa do Crédito S.A.",
  "163": "Commerzbank Brasil S.A. - Banco Múltiplo",
  "184": "Banco Itaú BBA S.A.",
  "204": "Banco Bradesco Cartões S.A.",
  "212": "Banco Original S.A.",
  "213": "Banco Arbi S.A.",
  "217": "Banco John Deere S.A.",
  "218": "Banco BS2 S.A.",
  "222": "Banco Credit Agricole Brasil S.A.",
  "224": "Banco Fibra S.A.",
  "233": "Banco BMG Soluções Financeiras S.A.",
  "237": "Banco Bradesco S.A.",
  "241": "Banco Clássico S.A.",
  "246": "Banco ABC Brasil S.A.",
  "247": "Banco UBS S.A.",
  "250": "BCV - Banco de Crédito e Varejo S.A.",
  "254": "Paraná Banco S.A.",
  "260": "Nu Pagamentos S.A.",
  "266": "Banco Cédula S.A.",
  "276": "Banco Senff S.A.",
  "299": "Banco Afinz S.A. Banco Múltiplo",
  "300": "Banco de La Nacion Argentina",
  "320": "Bank Of China (Brasil) Banco Múltiplo S.A.",
  "330": "Banco Bari de Investimentos e Financiamentos S.A.",
  "336": "C6 Bank S.A.",
  "341": "Itaú Unibanco S.A.",
  "348": "Banco XP S.A.",
  "359": "Zema Crédito, Financiamento e Investimento S.A.",
  "366": "Banco Société Générale Brasil S.A.",
  "370": "Banco Mizuho do Brasil S.A.",
  "373": "UP.P Sociedade de Empréstimo Entre Pessoas S.A.",
  "376": "Banco J. P. Morgan S.A.",
  "389": "Banco Mercantil do Brasil S.A.",
  "394": "Banco Bradesco Financiamentos S.A.",
  "399": "HSBC Bank Brasil S.A.",
  "422": "Banco Safra S.A.",
  "456": "Banco MUFG Brasil S.A.",
  "473": "Banco Caixa Geral - Brasil S.A.",
  "477": "Citibank N.A.",
  "478": "Gazincred S.A.",
  "479": "Banco ItauBank S.A.",
  "487": "Deutsche Bank S.A. - Banco Alemão",
  "488": "JPMorgan Chase Bank, National Association",
  "492": "ING Bank N.V.",
  "494": "Banco de La Republica Oriental del Uruguay",
  "495": "Banco de La Provincia de Buenos Aires",
  "496": "BBVA Brasil Banco de Investimento S.A.",
  "505": "Banco UBS (Brasil) S.A.",
  "612": "Banco Guanabara S.A.",
  "613": "Omni Banco S.A.",
  "626": "Banco C6 Consignado S.A.",
  "630": "Banco Bluebank S.A.",
  "633": "Banco Rendimento S.A.",
  "637": "Banco Sofisa S.A.",
  "641": "Banco Alvorada S.A.",
  "643": "Banco Pine S.A.",
  "652": "Itaú Unibanco Holding S.A.",
  "653": "Banco Pleno S.A.",
  "654": "Banco Digimais S.A.",
  "655": "Banco Votorantim S.A.",
  "656": "Banco Master S.A.",
  "657": "Banco Toyota do Brasil S.A.",
  "658": "Banco Porto Real de Investimentos S.A.",
  "666": "Banco Modal S.A.",
  "707": "Banco Daycoval S.A.",
  "712": "Ouribank S.A. Banco Múltiplo",
  "720": "Banco RNX S.A.",
  "739": "Banco Cetelem S.A.",
  "741": "Banco Ribeirão Preto S.A.",
  "743": "Banco Semear S.A.",
  "745": "Banco Citibank S.A.",
  "746": "Banco Modal S.A.",
  "747": "Banco Rabobank International Brasil S.A.",
  "748": "Banco Cooperativo Sicredi S.A.",
  "754": "Banco Sistema S.A.",
  "755": "Bank of America Merrill Lynch Banco Múltiplo S.A.",
  "756": "Banco Cooperativo Sicoob S.A.",
  "757": "Banco KEB HANA do Brasil S.A."
};

const BankAccountModal: React.FC<BankAccountModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    document: '',
    type: 'individual',
    bankCode: '',
    branchNumber: '',
    branchCheckDigit: '',
    accountNumber: '',
    accountCheckDigit: '',
    accountType: 'checking',
    holderName: '',
    holderType: 'individual',
    holderDocument: ''
  })

  // Pré-preencher com dados do usuário e, se existirem, com dados bancários já cadastrados
  useEffect(() => {
    if (isOpen && user) {
      // Ao editar, vai direto para etapa 2 (dados bancários) pois os dados do recebedor já existem
      setCurrentStep(initialData ? 2 : 1)
      setFormData(prev => ({
        ...prev,
        name: initialData?.recipientName || user.name || '',
        email: initialData?.recipientEmail || user.email || '',
        document: initialData?.recipientDocument || user.cpf || '',
        type: initialData?.recipientType || (user.cpf && user.cpf.replace(/\D/g, '').length <= 11 ? 'individual' : 'company'),
        bankCode: initialData?.bankCode || '',
        branchNumber: initialData?.branchNumber || '',
        branchCheckDigit: initialData?.branchCheckDigit || '',
        accountNumber: initialData?.accountNumber || '',
        accountCheckDigit: initialData?.accountCheckDigit || '',
        accountType: initialData?.accountType || 'checking',
        holderName: initialData?.holderName || user.name || '',
        holderType: initialData?.holderType || 'individual',
        holderDocument: initialData?.holderDocument || user.cpf || '',
      }))
    }
  }, [isOpen, user, initialData])

  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.email && formData.document && formData.type)
      case 2: {
        const docRaw = formData.document.replace(/\D/g, '')
        const holderDocRaw = formData.holderDocument.replace(/\D/g, '')
        if (docRaw !== holderDocRaw) {
          return false
        }

        return !!(
          formData.bankCode && 
          formData.branchNumber && 
          formData.accountNumber && 
          formData.accountCheckDigit && 
          formData.holderName && 
          formData.holderDocument
        )
      }
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    } else {
      toast.error('Por favor, preencha todos os campos obrigatórios')
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      toast.error('Por favor, verifique todos os dados')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/bank-account/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          document: formData.document.replace(/\D/g, ''),
          holderDocument: formData.holderDocument.replace(/\D/g, ''),
          // Configurações padrão (desabilitadas)
          transferEnabled: false,
          transferInterval: 'DAILY',
          anticipationEnabled: false
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar conta bancária')
      }

      toast.success(initialData ? 'Conta bancária atualizada com sucesso!' : 'Conta bancária cadastrada com sucesso!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao cadastrar conta bancária:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar conta bancária')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Editar Conta Bancária' : 'Cadastrar Conta Bancária'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {step === 1 ? <User className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                </div>
                <div className="ml-2 text-sm">
                  {step === 1 && 'Dados do Recebedor'}
                  {step === 2 && 'Dados Bancários'}
                </div>
                {step < 2 && (
                  <div className={`
                    w-16 h-0.5 mx-4
                    ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Step 1: Dados do Recebedor */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <User className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium">Dados do Recebedor</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.name.toUpperCase()}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF/CNPJ *
                </label>
                <input
                  type="text"
                  value={formatDocument(formData.document)}
                  onChange={(e) => handleInputChange('document', e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o CPF ou CNPJ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pessoa *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as 'individual' | 'company')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="individual">Pessoa Física</option>
                  <option value="company">Pessoa Jurídica</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Dados Bancários */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium">Dados Bancários</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banco *
                </label>
                <select
                  value={formData.bankCode}
                  onChange={(e) => handleInputChange('bankCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o banco</option>
                  {Object.entries(BANKS).map(([code, name]) => (
                    <option key={code} value={code}>
                      {code} - {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agência *
                  </label>
                  <input
                    type="text"
                    value={formData.branchNumber}
                    onChange={(e) => handleInputChange('branchNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dígito da Agência
                  </label>
                  <input
                    type="text"
                    value={formData.branchCheckDigit}
                    onChange={(e) => handleInputChange('branchCheckDigit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número da Conta *
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="00000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dígito da Conta *
                  </label>
                  <input
                    type="text"
                    value={formData.accountCheckDigit}
                    onChange={(e) => handleInputChange('accountCheckDigit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Conta *
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => handleInputChange('accountType', e.target.value as 'checking' | 'savings')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Conta Poupança</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Titular *
                </label>
                <input
                  type="text"
                  value={formData.holderName.toUpperCase()}
                  onChange={(e) => handleInputChange('holderName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo do titular"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF/CNPJ do Titular *
                  </label>
                  <input
                    type="text"
                    value={formatDocument(formData.holderDocument)}
                    onChange={(e) => handleInputChange('holderDocument', e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CPF ou CNPJ do titular"
                  />
                  {formData.holderDocument && formData.holderDocument.length > 10 && formData.holderDocument !== formData.document && (
                    <span className="text-xs text-orange-500">Atenção: O CPF/CNPJ do titular e do recebedor devem ser iguais</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo do Titular *
                  </label>
                  <select
                    value={formData.holderType}
                    onChange={(e) => handleInputChange('holderType', e.target.value as 'individual' | 'company')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="individual">Pessoa Física</option>
                    <option value="company">Pessoa Jurídica</option>
                  </select>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-3">
            {currentStep > 1 && !initialData && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Anterior
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            
            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading || !validateStep(2)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? (initialData ? 'Atualizando...' : 'Cadastrando...')
                  : (initialData ? 'Salvar Alterações' : 'Cadastrar Conta')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BankAccountModal