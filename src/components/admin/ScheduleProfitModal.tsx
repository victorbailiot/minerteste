'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { ProfitSchedule } from '@/types/profit-schedule'

interface ScheduleProfitModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingSchedule?: ProfitSchedule | null
}

interface MinerOption {
  id: number
  name: string
}

export default function ScheduleProfitModal({
  isOpen,
  onClose,
  onSuccess,
  editingSchedule
}: ScheduleProfitModalProps) {
  const [formData, setFormData] = useState({
    totalProfit: '',
    minerId: '',
    scheduledAt: '',
    isActive: false
  })
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [loadingMiners, setLoadingMiners] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Função para formatar valor como moeda brasileira
  const formatCurrencyInput = useCallback((value: string) => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, '')

    // Se não há valor, retorna vazio
    if (!numericValue) return ''

    // Converte para centavos e formata
    const cents = parseInt(numericValue)
    const reais = cents / 100

    // Formata com 2 casas decimais
    return reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }, [])

  // Função para converter valor formatado para número
  const parseCurrencyValue = useCallback((formattedValue: string) => {
    if (!formattedValue) return 0

    // Remove pontos de milhares e substitui vírgula por ponto
    const numericString = formattedValue
      .replace(/\./g, '') // Remove pontos de milhares
      .replace(',', '.') // Substitui vírgula por ponto

    return parseFloat(numericString)
  }, [])

  const loadMiners = useCallback(async () => {
    try {
      setLoadingMiners(true)
      const response = await fetch('/api/miners')
      const result = await response.json()

      if (response.ok && result.success) {
        const mappedMiners = (result.data || []).map((miner: { id: string; name: string }) => ({
          id: Number(miner.id),
          name: miner.name
        }))
        setMiners(mappedMiners)
      } else {
        setError(result.error || 'Erro ao carregar mineradoras')
      }
    } catch (fetchError) {
      console.error('Erro ao carregar mineradoras:', fetchError)
      setError('Erro ao carregar mineradoras')
    } finally {
      setLoadingMiners(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadMiners()
    }
  }, [isOpen, loadMiners])

  // Preencher formulário quando estiver editando
  useEffect(() => {
    if (editingSchedule) {
      const scheduledDate = new Date(editingSchedule.scheduledAt)
      // Formatar para datetime-local (YYYY-MM-DDTHH:mm)
      const formattedDate = scheduledDate.toISOString().slice(0, 16)
      
      // Formatar valor com máscara de moeda
      // Converter para centavos (multiplicar por 100) e depois formatar
      const valueInCents = Math.round(editingSchedule.totalProfit * 100)
      const formattedValue = formatCurrencyInput(valueInCents.toString())
      
      setFormData({
        totalProfit: formattedValue,
        minerId: editingSchedule.minerId ? editingSchedule.minerId.toString() : '',
        scheduledAt: formattedDate,
        isActive: editingSchedule.isActive
      })
    } else {
      // Resetar formulário para novo agendamento
      setFormData({
        totalProfit: '',
        minerId: '',
        scheduledAt: '',
        isActive: false
      })
    }
    setError(null)
  }, [editingSchedule, isOpen, formatCurrencyInput])

  // Validar formulário
  const validateForm = () => {
    const numericValue = parseCurrencyValue(formData.totalProfit)
    if (!formData.totalProfit || numericValue <= 0) {
      setError('O valor total do lucro deve ser maior que zero')
      return false
    }

    if (!formData.scheduledAt) {
      setError('A data e hora de execução são obrigatórias')
      return false
    }

    if (!formData.minerId) {
      setError('A mineradora é obrigatória')
      return false
    }

    const scheduledDate = new Date(formData.scheduledAt)
    if (scheduledDate <= new Date()) {
      setError('A data e hora de execução deve ser no futuro')
      return false
    }

    return true
  }

  // Salvar agendamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      // Converter scheduledAt para formato ISO
      const scheduledDate = new Date(formData.scheduledAt).toISOString()

      // Converter valor formatado para número
      const numericValue = parseCurrencyValue(formData.totalProfit)

      const requestData = {
        totalProfit: numericValue,
        minerId: Number(formData.minerId),
        scheduledAt: scheduledDate,
        isActive: formData.isActive
      }

      let response
      if (editingSchedule) {
        // Atualizar agendamento existente
        response = await fetch('/api/admin/profit-schedules', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: editingSchedule.id,
            ...requestData
          })
        })
      } else {
        // Criar novo agendamento
        response = await fetch('/api/admin/profit-schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })
      }

      const result = await response.json()

      if (result.success) {
        toast.success(
          editingSchedule 
            ? 'Agendamento atualizado com sucesso!' 
            : 'Agendamento criado com sucesso!'
        )
        onSuccess()
      } else {
        setError(result.error || result.message || 'Erro ao salvar agendamento')
        toast.error(result.error || result.message || 'Erro ao salvar agendamento')
      }
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error)
      setError('Erro ao salvar agendamento. Tente novamente.')
      toast.error('Erro ao salvar agendamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSchedule ? 'Editar Agendamento' : 'Agendar Divisão de Lucro'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Valor Total do Lucro */}
          <div>
            <Label htmlFor="totalProfit">
              Valor Total do Lucro (R$) *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                R$
              </span>
              <Input
                id="totalProfit"
                type="text"
                value={formData.totalProfit}
                onChange={(e) => {
                  const formattedValue = formatCurrencyInput(e.target.value)
                  setFormData({ ...formData, totalProfit: formattedValue })
                  setError(null)
                }}
                placeholder="0,00"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Informe o valor total do lucro a ser dividido entre os pacotes
            </p>
          </div>

          {/* Mineradora */}
          <div>
            <Label htmlFor="minerId">
              Mineradora *
            </Label>
            <select
              id="minerId"
              value={formData.minerId}
              onChange={(e) => {
                setFormData({ ...formData, minerId: e.target.value })
                setError(null)
              }}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              required
              disabled={loadingMiners || loading}
            >
              <option value="">
                {loadingMiners ? 'Carregando mineradoras...' : 'Selecione uma mineradora'}
              </option>
              {miners.map((miner) => (
                <option key={miner.id} value={miner.id}>
                  {miner.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              A divisão será executada somente para cotas desta mineradora
            </p>
          </div>

          {/* Data e Hora de Execução */}
          <div>
            <Label htmlFor="scheduledAt">
              Data e Hora de Execução *
            </Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => {
                setFormData({ ...formData, scheduledAt: e.target.value })
                setError(null)
              }}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Selecione quando a divisão de lucro será executada
            </p>
          </div>

          {/* Checkbox Ativo/Inativo */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="isActive" className="text-base font-medium">
                Agendamento Ativo
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Quando ativo, este agendamento será exibido no dashboard dos usuários.
                Apenas um agendamento pode estar ativo por vez.
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => {
                setFormData({ ...formData, isActive: checked })
                setError(null)
              }}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Salvando...' : editingSchedule ? 'Atualizar' : 'Criar Agendamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

