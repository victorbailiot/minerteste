'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createFinancialTransactionSchema } from '@/types/financial'
import type { CreateFinancialTransactionInput } from '@/types/financial'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  DollarSign, 
  FileText, 
  Tag,
  Scale,
  CheckCircle,
  XCircle,
  Upload,
  Image as ImageIcon,
  File,
  X
} from 'lucide-react'
import { FinancialTransactionResponse } from '@/types/financial'

interface FinancialTransactionFormProps {
  onSubmit: (data: CreateFinancialTransactionInput) => Promise<void>
  onCancel: () => void
  transaction?: FinancialTransactionResponse | null
}

export function FinancialTransactionForm({ onSubmit, onCancel, transaction }: FinancialTransactionFormProps) {
  // Função para aplicar máscara de moeda
  const formatCurrencyInput = (value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '')
    
    if (!numbers) return ''
    
    // Converte para número e divide por 100 para ter centavos
    const amount = parseInt(numbers) / 100
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Função para extrair valor numérico da máscara
  const parseCurrencyInput = (formattedValue: string): number => {
    // Remove símbolos de moeda e espaços
    const cleanValue = formattedValue.replace(/[R$\s.]/g, '').replace(',', '.')
    return parseFloat(cleanValue) || 0
  }

  // Função para formatar valor numérico como moeda (para valores já existentes)
  const formatNumberToCurrency = (value: number | null | undefined): string => {
    if (!value) return ''
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const [formData, setFormData] = useState({
    type: transaction?.type || 'INCOME',
    category: transaction?.category || 'SALE',
    description: transaction?.description || '',
    transactionDate: transaction 
      ? dayjs(transaction.transactionDate).format('YYYY-MM-DDTHH:mm')
      : dayjs().format('YYYY-MM-DDTHH:mm'),
    quantity: transaction?.quantity?.toString() || '',
    unitPrice: transaction?.unitPrice ? formatNumberToCurrency(transaction.unitPrice) : '',
    totalAmount: transaction?.totalAmount ? formatNumberToCurrency(transaction.totalAmount) : ''
  })
  const [receiptFiles, setReceiptFiles] = useState<File[]>([])
  const [existingReceipts, setExistingReceipts] = useState<string[]>(transaction?.receiptUrls || [])
  const [uploadingReceipts, setUploadingReceipts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Atualizar valor total automaticamente
  useEffect(() => {
    if (formData.quantity && formData.unitPrice) {
      const quantity = parseFloat(formData.quantity)
      const unitPrice = parseCurrencyInput(formData.unitPrice)
      if (quantity && unitPrice) {
        const total = quantity * unitPrice
        const formattedTotal = formatNumberToCurrency(total)
        setFormData(prev => ({ ...prev, totalAmount: formattedTotal }))
      }
    }
  }, [formData.quantity, formData.unitPrice])

  const validateForm = () => {
    try {
      const parsedData = {
        type: formData.type,
        category: formData.category,
        description: formData.description,
        transactionDate: dayjs(formData.transactionDate).toISOString(),
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unitPrice: formData.unitPrice ? parseCurrencyInput(formData.unitPrice) : undefined,
        totalAmount: parseCurrencyInput(formData.totalAmount)
      }

      createFinancialTransactionSchema.parse(parsedData)
      setErrors({})
      return true
    } catch (error: any) {
      const newErrors: Record<string, string> = {}
      if (error?.issues?.length > 0) {
        error.issues.forEach((issue: any) => {
          const field = issue.path[0]
          newErrors[field] = issue.message
        })
        
        // Mostrar toast de erro de validação
        toast.error('Por favor, corrija os erros no formulário', {
          description: 'Verifique os campos destacados em vermelho.',
          icon: <XCircle className="w-5 h-5" />
        })
      } else {
        newErrors.form = 'Erro de validação. Verifique os dados informados.'
        toast.error('Erro de validação', {
          description: 'Verifique os dados informados.',
          icon: <XCircle className="w-5 h-5" />
        })
      }
      setErrors(newErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)
      
      // Toast de loading
      const loadingToast = toast.loading('Salvando transação...', {
        description: 'Aguarde enquanto processamos sua solicitação.'
      })

      await onSubmit({
        type: formData.type as 'INCOME' | 'EXPENSE',
        category: formData.category as any,
        description: formData.description,
        transactionDate: dayjs(formData.transactionDate).toISOString(),
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unitPrice: formData.unitPrice ? parseCurrencyInput(formData.unitPrice) : undefined,
        totalAmount: parseCurrencyInput(formData.totalAmount),
        receiptUrls: existingReceipts.length > 0 ? existingReceipts : undefined
      })

      // Remover toast de loading e mostrar sucesso
      toast.dismiss(loadingToast)
      toast.success('Transação salva com sucesso!', {
        description: 'A transação foi registrada no sistema.',
        icon: <CheckCircle className="w-5 h-5" />
      })
      
      // setShowForm(false) // This line was removed as per the new_code, as the form is now always rendered.
      
    } catch (error) {
      console.error('Erro ao submeter formulário:', error)
      
      // Mostrar erro
      toast.error('Erro ao salvar transação', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao processar sua solicitação.',
        icon: <XCircle className="w-5 h-5" />
      })
      
      setErrors({
        form: error instanceof Error ? error.message : 'Erro ao salvar transação'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    if (newDate) {
      setFormData({ ...formData, transactionDate: newDate })
      setErrors(prev => ({ ...prev, transactionDate: '' }))
    }
  }

  // Função para fazer upload de comprovantes
  const handleReceiptUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const validFiles = Array.from(files).filter(file => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Arquivo ${file.name} não é válido`, {
          description: 'Apenas PDF, JPG, PNG e WEBP são aceitos.',
          icon: <XCircle className="w-5 h-5" />
        })
        return false
      }
      
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} muito grande`, {
          description: 'Tamanho máximo: 10MB',
          icon: <XCircle className="w-5 h-5" />
        })
        return false
      }
      
      return true
    })

    if (validFiles.length === 0) return

    setUploadingReceipts(true)
    const uploadToast = toast.loading(`Enviando ${validFiles.length} comprovante(s)...`)

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        if (transaction?.id) {
          formData.append('transactionId', transaction.id)
        }

        const response = await fetch('/api/financial/receipt', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao fazer upload')
        }

        const data = await response.json()
        return data.url
      })

      const urls = await Promise.all(uploadPromises)
      setExistingReceipts(prev => [...prev, ...urls])
      setReceiptFiles([])

      toast.dismiss(uploadToast)
      toast.success(`${urls.length} comprovante(s) enviado(s) com sucesso!`, {
        icon: <CheckCircle className="w-5 h-5" />
      })
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.dismiss(uploadToast)
      toast.error('Erro ao fazer upload dos comprovantes', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        icon: <XCircle className="w-5 h-5" />
      })
    } finally {
      setUploadingReceipts(false)
    }
  }

  // Função para remover comprovante
  const handleRemoveReceipt = (index: number) => {
    setExistingReceipts(prev => prev.filter((_, i) => i !== index))
  }

  const inputClasses = "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-colors duration-200"
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1"
  const iconClasses = "w-5 h-5 text-gray-400 mr-2"
  const errorClasses = "text-red-500 text-sm mt-1"
  const groupClasses = "p-4 bg-gray-50 rounded-lg space-y-4"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.form && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative">
          {errors.form}
        </div>
      )}
      
      {/* Informações Básicas */}
      <div className={groupClasses}>
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Informações Básicas</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>
              <div className="flex items-center">
                {formData.type === 'INCOME' ? (
                  <ArrowUpCircle className={`${iconClasses} text-green-500`} />
                ) : (
                  <ArrowDownCircle className={`${iconClasses} text-red-500`} />
                )}
                Tipo de Transação
              </div>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INCOME' | 'EXPENSE' })}
              className={inputClasses}
              disabled={isSubmitting}
            >
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </select>
            {errors.type && <p className={errorClasses}>{errors.type}</p>}
          </div>

          <div>
            <label className={labelClasses}>
              <div className="flex items-center">
                <Tag className={iconClasses} />
                Categoria
              </div>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={inputClasses}
              disabled={isSubmitting}
            >
              {/* Receitas */}
              <optgroup label="Receitas">
                <option value="SALE">Venda de Cobre</option>
                <option value="INVESTMENT">Investimento</option>
                <option value="GRANT">Subsídio</option>
                <option value="LOAN">Empréstimo</option>
              </optgroup>
              
              {/* Custos Operacionais - Extração e Processamento */}
              <optgroup label="Custos Operacionais - Extração e Processamento">
                <option value="FUEL">Combustível/Gasolina</option>
                <option value="EXPLOSIVES">Explosivos</option>
                <option value="PROCESSING">Processamento/Beneficiamento</option>
                <option value="WATER">Água</option>
                <option value="ENERGY">Energia/Eletricidade</option>
              </optgroup>
              
              {/* Equipamentos e Manutenção */}
              <optgroup label="Equipamentos e Manutenção">
                <option value="EQUIPMENT">Equipamentos e Máquinas</option>
                <option value="MAINTENANCE">Manutenção de Equipamentos</option>
                <option value="REPAIRS">Reparos</option>
                <option value="SUPPLY_PURCHASE">Compra de Suprimentos/Peças</option>
              </optgroup>
              
              {/* Transporte e Logística */}
              <optgroup label="Transporte e Logística">
                <option value="TRANSPORT">Transporte Interno</option>
                <option value="FREIGHT">Frete/Transporte Externo</option>
              </optgroup>
              
              {/* Recursos Humanos */}
              <optgroup label="Recursos Humanos">
                <option value="SALARY">Salários</option>
                <option value="LABOR">Mão de Obra</option>
                <option value="TRAINING">Treinamento</option>
                <option value="TRAVEL">Viagens</option>
              </optgroup>
              
              {/* Infraestrutura e Serviços */}
              <optgroup label="Infraestrutura e Serviços">
                <option value="RENTAL">Aluguel</option>
                <option value="UTILITIES">Utilidades (Água, Luz, Telefone)</option>
                <option value="OFFICE">Despesas de Escritório</option>
                <option value="SUBSCRIPTION">Assinaturas e Serviços</option>
              </optgroup>
              
              {/* Exploração e Desenvolvimento */}
              <optgroup label="Exploração e Desenvolvimento">
                <option value="EXPLORATION">Exploração e Avaliação</option>
                <option value="DEVELOPMENT">Desenvolvimento e Construção</option>
                <option value="CONSULTING">Consultoria Técnica</option>
              </optgroup>
              
              {/* Compliance e Legal */}
              <optgroup label="Compliance e Legal">
                <option value="ENVIRONMENTAL">Compliance Ambiental</option>
                <option value="INSURANCE">Seguros</option>
                <option value="LEGAL">Despesas Jurídicas</option>
                <option value="TAX">Impostos e Taxas</option>
                <option value="PENALTY">Multas</option>
              </optgroup>
              
              {/* Marketing e Vendas */}
              <optgroup label="Marketing e Vendas">
                <option value="MARKETING">Marketing e Publicidade</option>
              </optgroup>
              
              {/* Financeiro */}
              <optgroup label="Financeiro">
                <option value="INTEREST">Juros</option>
                <option value="DEPRECIATION">Depreciação</option>
                <option value="PROFIT_DISTRIBUTION">Divisão de Lucro</option>
                <option value="ADJUSTMENT">Ajuste Contábil</option>
              </optgroup>
              
              {/* Outros */}
              <optgroup label="Outros">
                <option value="OTHER">Outros</option>
              </optgroup>
            </select>
            {errors.category && <p className={errorClasses}>{errors.category}</p>}
          </div>
        </div>

        <div>
          <label className={labelClasses}>
            <div className="flex items-center">
              <Calendar className={iconClasses} />
              Data da Transação
            </div>
          </label>
          <input
            type="datetime-local"
            value={formData.transactionDate}
            onChange={handleDateChange}
            className={inputClasses}
            disabled={isSubmitting}
          />
          {errors.transactionDate && <p className={errorClasses}>{errors.transactionDate}</p>}
        </div>
      </div>

      {/* Valores */}
      <div className={groupClasses}>
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Valores</h4>
        
        {formData.category === 'SALE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>
                <div className="flex items-center">
                  <Scale className={iconClasses} />
                  Quantidade (ton)
                </div>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className={inputClasses}
                min="0"
                step="0.01"
                disabled={isSubmitting}
              />
              {errors.quantity && <p className={errorClasses}>{errors.quantity}</p>}
            </div>

            <div>
              <label className={labelClasses}>
                <div className="flex items-center">
                  <DollarSign className={iconClasses} />
                  Preço por Tonelada (R$)
                </div>
              </label>
              <input
                type="text"
                value={formData.unitPrice}
                onChange={(e) => {
                  const formatted = formatCurrencyInput(e.target.value)
                  setFormData({ ...formData, unitPrice: formatted })
                  setErrors(prev => ({ ...prev, unitPrice: '' }))
                }}
                className={inputClasses}
                placeholder="R$ 0,00"
                disabled={isSubmitting}
              />
              {errors.unitPrice && <p className={errorClasses}>{errors.unitPrice}</p>}
            </div>
          </div>
        )}

        <div>
          <label className={labelClasses}>
            <div className="flex items-center">
              <DollarSign className={iconClasses} />
              Valor Total (R$)
            </div>
          </label>
          <input
            type="text"
            value={formData.totalAmount}
            onChange={(e) => {
              if (formData.category !== 'SALE') {
                const formatted = formatCurrencyInput(e.target.value)
                setFormData({ ...formData, totalAmount: formatted })
                setErrors(prev => ({ ...prev, totalAmount: '' }))
              }
            }}
            className={`${inputClasses} ${formData.category === 'SALE' ? 'bg-gray-100' : ''}`}
            placeholder="R$ 0,00"
            readOnly={formData.category === 'SALE'}
            disabled={isSubmitting}
          />
          {errors.totalAmount && <p className={errorClasses}>{errors.totalAmount}</p>}
          {formData.category === 'SALE' && formData.quantity && formData.unitPrice && (
            <p className="text-sm text-gray-500 mt-1">
              Valor calculado automaticamente: {formData.quantity} ton × {formData.unitPrice}
            </p>
          )}
        </div>
      </div>

      {/* Descrição */}
      <div className={groupClasses}>
        <label className={labelClasses}>
          <div className="flex items-center">
            <FileText className={iconClasses} />
            Descrição (opcional)
          </div>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={`${inputClasses} min-h-[100px]`}
          rows={3}
          disabled={isSubmitting}
        />
        {errors.description && <p className={errorClasses}>{errors.description}</p>}
      </div>

      {/* Comprovantes */}
      <div className={groupClasses}>
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Comprovantes (opcional)</h4>
        
        {/* Upload de arquivos */}
        <div>
          <label className={labelClasses}>
            <div className="flex items-center">
              <Upload className={iconClasses} />
              Adicionar Comprovantes (PDF ou Imagens)
            </div>
          </label>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            onChange={(e) => handleReceiptUpload(e.target.files)}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || uploadingReceipts}
          />
          <p className="text-xs text-gray-500 mt-1">
            Formatos aceitos: PDF, JPG, PNG, WEBP. Tamanho máximo: 10MB por arquivo.
          </p>
        </div>

        {/* Lista de comprovantes existentes */}
        {existingReceipts.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comprovantes anexados ({existingReceipts.length})
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {existingReceipts.map((url, index) => {
                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(url)
                const isPdf = /\.pdf$/i.test(url)
                
                return (
                  <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                    {isImage ? (
                      <img
                        src={url}
                        alt={`Comprovante ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                    ) : isPdf ? (
                      <div className="w-full h-32 bg-red-50 flex items-center justify-center">
                        <File className="w-12 h-12 text-red-500" />
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveReceipt(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 text-center hover:bg-opacity-90 transition-opacity"
                    >
                      Ver comprovante
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="px-6"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 px-6"
          disabled={isSubmitting}
        >
          {isSubmitting 
            ? (transaction ? 'Atualizando...' : 'Salvando...') 
            : (transaction ? 'Atualizar Transação' : 'Salvar Transação')
          }
        </Button>
      </div>
    </form>
  )
} 