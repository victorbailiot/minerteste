'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Calendar, DollarSign, Clock, Plus, Edit, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import ScheduleProfitModal from '@/components/admin/ScheduleProfitModal'
import { ProfitSchedule } from '@/types/profit-schedule'

interface MinerOption {
  id: number
  name: string
}

export default function DivisaoLucroPage() {
  const [schedules, setSchedules] = useState<ProfitSchedule[]>([])
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [selectedMinerId, setSelectedMinerId] = useState('all')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ProfitSchedule | null>(null)

  // Carregar agendamentos
  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/profit-schedules')
      const result = await response.json()
      
      if (result.success) {
        setSchedules(result.data)
      } else {
        toast.error('Erro ao carregar agendamentos')
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  useEffect(() => {
    const loadMiners = async () => {
      try {
        const response = await fetch('/api/miners')
        const result = await response.json()
        if (response.ok && result.success) {
          const mappedMiners = (result.data || []).map((miner: { id: string; name: string }) => ({
            id: Number(miner.id),
            name: miner.name
          }))
          setMiners(mappedMiners)
        }
      } catch (error) {
        console.error('Erro ao carregar mineradoras:', error)
      }
    }

    loadMiners()
  }, [])

  // Abrir modal para criar novo
  const handleCreateNew = () => {
    setEditingSchedule(null)
    setIsModalOpen(true)
  }

  // Abrir modal para editar
  const handleEdit = (schedule: ProfitSchedule) => {
    setEditingSchedule(schedule)
    setIsModalOpen(true)
  }

  // Alternar status ativo/inativo
  const handleToggleStatus = async (schedule: ProfitSchedule) => {
    try {
      const response = await fetch('/api/admin/profit-schedules', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: schedule.id,
          isActive: !schedule.isActive
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Agendamento ${!schedule.isActive ? 'ativado' : 'desativado'} com sucesso!`)
        loadSchedules()
      } else {
        toast.error(result.error || 'Erro ao alterar status do agendamento')
      }
    } catch (error) {
      console.error('Erro ao alterar status do agendamento:', error)
      toast.error('Erro ao alterar status do agendamento')
    }
  }

  // Callback quando modal é fechado com sucesso
  const handleModalSuccess = () => {
    setIsModalOpen(false)
    setEditingSchedule(null)
    loadSchedules()
  }

  // Formatar data e hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando agendamentos...</p>
        </div>
      </div>
    )
  }

  const filteredSchedules = selectedMinerId === 'all'
    ? schedules
    : schedules.filter((schedule) => schedule.minerId === Number(selectedMinerId))

  const activeSchedules = filteredSchedules.filter(s => s.isActive).length
  const inactiveSchedules = filteredSchedules.filter(s => !s.isActive).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agendamento de Divisão de Lucro</h1>
          <p className="text-gray-600 mt-2">Gerencie os agendamentos de divisão de lucros</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMinerId}
            onChange={(e) => setSelectedMinerId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todas as mineradoras</option>
            {miners.map((miner) => (
              <option key={miner.id} value={miner.id}>
                {miner.name}
              </option>
            ))}
          </select>
          <Button onClick={handleCreateNew} className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Agendar Divisão de Lucro</span>
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total de Agendamentos</p>
                <p className="text-2xl font-bold">{filteredSchedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Agendamentos Ativos</p>
                <p className="text-2xl font-bold">{activeSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Agendamentos Inativos</p>
                <p className="text-2xl font-bold">{inactiveSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Agendamentos */}
      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento criado</h3>
            <p className="text-gray-600 mb-4">Crie seu primeiro agendamento de divisão de lucro</p>
            <Button onClick={handleCreateNew}>
              <Plus className="h-5 w-5 mr-2" />
              Criar Agendamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSchedules.map((schedule) => (
            <Card key={schedule.id} className={`relative ${schedule.isActive ? 'ring-2 ring-green-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Agendamento #{schedule.id}</CardTitle>
                  <Badge variant={schedule.isActive ? "default" : "secondary"}>
                    {schedule.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Valor Total */}
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Valor Total do Lucro</p>
                  <p className="font-bold text-blue-600 text-xl">{formatCurrency(schedule.totalProfit)}</p>
                </div>

                {/* Mineradora */}
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-gray-600">Mineradora</p>
                  <p className="font-semibold text-amber-700">
                    {schedule.miner?.name || 'Não informada'}
                  </p>
                </div>

                {/* Data e Hora */}
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Data/Hora de Execução</p>
                  <p className="font-semibold text-purple-600">{formatDateTime(schedule.scheduledAt)}</p>
                </div>

                {/* Informações Adicionais */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Criado em:</span>
                    <span className="font-medium">{formatDateTime(schedule.createdAt)}</span>
                  </div>
                  {schedule.createdByUser && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Criado por:</span>
                      <span className="font-medium">{schedule.createdByUser.name}</span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(schedule)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={schedule.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(schedule)}
                    className="flex-1"
                  >
                    {schedule.isActive ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Agendamento */}
      <ScheduleProfitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingSchedule(null)
        }}
        onSuccess={handleModalSuccess}
        editingSchedule={editingSchedule}
      />
    </div>
  )
}

