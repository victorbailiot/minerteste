import { SupportTicketStatus } from '@/lib/validations/support'

// Tipos principais do sistema de suporte
export interface SupportTicket {
  id: string
  userId: string
  subject: string
  status: SupportTicketStatus
  createdAt: Date
  updatedAt: Date
}

export interface SupportTicketMessage {
  id: string
  ticketId: string
  userId: string
  message: string
  isAdminReply: boolean
  createdAt: Date
}

export interface SupportTicketImage {
  id: string
  ticketId: string
  imageUrl: string
  createdAt: Date
}

// Tipos para listagem de tickets
export interface SupportTicketListItem {
  id: string
  subject: string
  status: SupportTicketStatus
  createdAt: Date
  updatedAt: Date
  messageCount: number
  user: {
    id: string
    name: string
    email: string
  }
}

// Tipos para detalhes completos do ticket
export interface SupportTicketDetails {
  id: string
  subject: string
  status: SupportTicketStatus
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    email: string
    phone: string
  }
  messages: SupportTicketMessageWithUser[]
  images: SupportTicketImage[]
}

export interface SupportTicketMessageWithUser {
  id: string
  message: string
  isAdminReply: boolean
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
  }
}

// Tipos para criação de tickets
export interface CreateSupportTicketRequest {
  subject: string
  message?: string
  images?: File[]
}

export interface CreateSupportTicketResponse {
  ticket: SupportTicketDetails
  success: boolean
  message: string
}

// Tipos para mensagens
export interface AddMessageRequest {
  message: string
}

export interface AddMessageResponse {
  message: SupportTicketMessageWithUser
  success: boolean
}

// Tipos para atualização de status
export interface UpdateStatusRequest {
  status: SupportTicketStatus
}

export interface UpdateStatusResponse {
  ticket: SupportTicket
  success: boolean
  message: string
}

// Tipos para paginação
export interface PaginatedSupportTickets {
  tickets: SupportTicketListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Tipos para filtros
export interface SupportTicketFilters {
  status?: SupportTicketStatus
  userId?: string
  search?: string
  page?: number
  limit?: number
}

// Tipos para estatísticas (admin)
export interface SupportTicketStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
}

// Tipos para componentes
export interface SupportTicketStatusBadgeProps {
  status: SupportTicketStatus
  className?: string
}

export interface SupportImageGalleryProps {
  images: SupportTicketImage[]
  className?: string
}

export interface SupportChatMessagesProps {
  messages: SupportTicketMessageWithUser[]
  currentUserId: string
  className?: string
}

// Tipos para modais
export interface NewSupportTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (ticket: SupportTicketDetails) => void
}

// Tipos para formulários
export interface SupportTicketFormData {
  subject: string
  message: string
  images: File[]
}

// Tipos para notificações
export interface SupportTicketNotification {
  type: 'status_changed' | 'new_message' | 'ticket_created'
  ticketId: string
  message: string
  timestamp: Date
}
