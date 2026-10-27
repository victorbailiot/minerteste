'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, MessageCircle, Calendar, User, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import SupportTicketStatusBadge from '@/components/SupportTicketStatusBadge'
import NewSupportTicketModal from '@/components/NewSupportTicketModal'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

interface SupportTicketListItem {
  id: string
  subject: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  createdAt: string
  updatedAt: string
  messageCount: number
  user: {
    id: string
    name: string
    email: string
  }
}

interface PaginatedResponse {
  tickets: SupportTicketListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [error, setError] = useState<string>('')

  const fetchTickets = async (page = 1, status = '') => {
    try {
      setIsLoading(true)
      setError('')
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (status) {
        params.append('status', status)
      }

      const response = await fetch(`/api/admin/support/tickets?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`)
      }
      
      const data: PaginatedResponse = await response.json()

      setTickets(data.tickets)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Erro ao carregar tickets:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error(`Erro ao carregar tickets: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets(1, statusFilter)
  }, [statusFilter])

  const handleNewTicketSuccess = (ticket: any) => {
    // Recarregar lista de tickets
    fetchTickets(1, statusFilter)
  }

  const handlePageChange = (newPage: number) => {
    fetchTickets(newPage, statusFilter)
  }

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'OPEN', label: 'Abertos' },
    { value: 'IN_PROGRESS', label: 'Em Análise' },
    { value: 'RESOLVED', label: 'Resolvidos' },
    { value: 'CLOSED', label: 'Fechados' }
  ]

  if (error) {
    return (
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suporte - Admin</h1>
            <p className="text-gray-600">
              Gerencie todos os tickets de suporte do sistema
            </p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Ticket
          </button>
        </div>

        {/* Erro */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <MessageCircle className="h-8 w-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Erro ao carregar tickets</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => fetchTickets(1, statusFilter)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suporte - Admin</h1>
          <p className="text-gray-600">
            Gerencie todos os tickets de suporte do sistema
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Ticket
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Tickets */}
      <div className="bg-white rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum ticket encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              {statusFilter 
                ? `Não há tickets com status "${statusOptions.find(opt => opt.value === statusFilter)?.label}"`
                : 'Não há tickets de suporte no sistema'
              }
            </p>
            {!statusFilter && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Criar Primeiro Ticket
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Lista */}
            <div className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/suporte/${ticket.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {ticket.subject}
                        </h3>
                        <SupportTicketStatusBadge status={ticket.status} />
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {ticket.user.name} ({ticket.user.email})
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {ticket.messageCount} mensagem{ticket.messageCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Criado em {dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}
                        </div>
                        {ticket.updatedAt !== ticket.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Atualizado em {dayjs(ticket.updatedAt).format('DD/MM/YYYY HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                    {pagination.total} tickets
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    
                    <span className="px-3 py-1 text-sm text-gray-700">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Novo Ticket */}
      <NewSupportTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleNewTicketSuccess}
      />
    </div>
  )
}
