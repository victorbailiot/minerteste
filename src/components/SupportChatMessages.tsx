import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import { MessageCircle, User, Shield } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

interface SupportTicketMessage {
  id: string
  message: string
  isAdminReply: boolean
  createdAt: Date | string
  user?: {
    id: string
    name: string
    email: string
  }
}

interface SupportChatMessagesProps {
  messages: SupportTicketMessage[]
  currentUserId: string
  className?: string
}

export const SupportChatMessages: React.FC<SupportChatMessagesProps> = ({
  messages,
  currentUserId,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!messages || messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-gray-500 ${className}`}>
        <MessageCircle className="w-12 h-12 mb-4" />
        <p>Nenhuma mensagem ainda</p>
        <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
      </div>
    )
  }

  // Filtrar mensagens válidas
  const validMessages = messages.filter(message => message && message.user)

  return (
    <div className={`space-y-4 ${className}`}>
      {validMessages.map((message) => {
        const isCurrentUser = message.user ? String(message.user.id) === String(currentUserId) : false
        const isAdmin = message.isAdminReply

        return (
          <div
            key={message.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm
                ${isCurrentUser
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                }
              `}
            >
              {/* Cabeçalho da mensagem */}
              <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'text-blue-100' : 'text-gray-600'}`}>
                {isAdmin ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {isAdmin ? 'Admin' : (message.user?.name?.split(' ')[0] || 'Usuário')}
                </span>
                <span className="text-xs opacity-75">
                  {dayjs(message.createdAt).format('DD/MM/YYYY HH:mm')}
                </span>
              </div>

              {/* Conteúdo da mensagem */}
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.message}
              </div>
            </div>
          </div>
        )
      })}
      
      {/* Elemento para scroll automático */}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default SupportChatMessages
