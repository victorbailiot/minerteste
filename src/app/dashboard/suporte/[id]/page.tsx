'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, Loader2, User, Calendar, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import SupportTicketStatusBadge from '@/components/SupportTicketStatusBadge'
import SupportImageGallery from '@/components/SupportImageGallery'
import SupportChatMessages from '@/components/SupportChatMessages'
import { useAuth } from '@/lib/hooks/useAuth'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

interface SupportTicketDetails {
  id: string
  subject: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    phone: string
  }
  messages: SupportTicketMessage[]
  images: SupportTicketImage[]
}

interface SupportTicketMessage {
  id: string
  message: string
  isAdminReply: boolean
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface SupportTicketImage {
  id: string
  imageUrl: string
  createdAt: string
}

export default function SupportTicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  const { user } = useAuth()
  
  const [ticket, setTicket] = useState<SupportTicketDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTicketDetails = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/support/tickets/${ticketId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar ticket')
      }

      setTicket(data.ticket)
    } catch (error) {
      console.error('Erro ao carregar ticket:', error)
      toast.error('Erro ao carregar detalhes do ticket')
      router.push('/dashboard/suporte')
    } finally {
      setIsLoading(false)
    }
  }, [ticketId, router])

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails()
    }
  }, [ticketId, fetchTicketDetails])

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Digite uma mensagem')
      return
    }

    if (ticket?.status === 'CLOSED') {
      toast.error('Não é possível enviar mensagens em tickets fechados')
      return
    }

    setIsSendingMessage(true)

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar mensagem')
      }

      // Adicionar nova mensagem à lista
      setTicket(prev => {
        if (!prev) return null
        return {
          ...prev,
          messages: [...prev.messages, data.message],
          updatedAt: new Date().toISOString()
        }
      })

      setNewMessage('')
      toast.success('Mensagem enviada com sucesso!')
      
      // Scroll para a última mensagem
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando ticket...</p>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Ticket não encontrado
        </h2>
        <p className="text-gray-600 mb-4">
          O ticket que você está procurando não existe ou você não tem permissão para visualizá-lo.
        </p>
        <button
          onClick={() => router.push('/dashboard/suporte')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Suporte
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/suporte')}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {ticket.subject}
            </h1>
            <SupportTicketStatusBadge status={ticket.status} />
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
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {ticket.messages.length} mensagem{ticket.messages.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Usuário */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Informações do Solicitante
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{ticket.user.name}</p>
              <p className="text-sm text-gray-500">{ticket.user.email}</p>
            </div>
          </div>
          {ticket.user.phone && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 text-gray-400">📞</div>
              <p className="text-sm text-gray-900">{ticket.user.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Galeria de Imagens */}
      {ticket.images.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Imagens Anexadas ({ticket.images.length})
          </h2>
          <SupportImageGallery images={ticket.images} />
        </div>
      )}

      {/* Chat de Mensagens */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversa
          </h2>
        </div>
        
        <div className="p-6 max-h-[500px] overflow-y-auto">
          <SupportChatMessages
            messages={ticket.messages}
            currentUserId={user?.id || ''}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Campo de Nova Mensagem */}
        {ticket.status !== 'CLOSED' && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isSendingMessage}
              />
              <button
                onClick={sendMessage}
                disabled={isSendingMessage || !newMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Pressione Enter para enviar, Shift+Enter para nova linha
            </p>
          </div>
        )}

        {ticket.status === 'CLOSED' && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              Este ticket foi fechado. Não é possível enviar novas mensagens.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
