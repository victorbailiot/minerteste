import { z } from 'zod'

// Enum para status do ticket
export const SupportTicketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])

// Schema para criar novo ticket
export const createTicketSchema = z.object({
  subject: z.string()
    .min(5, 'O assunto deve ter pelo menos 5 caracteres')
    .max(255, 'O assunto deve ter no máximo 255 caracteres'),
  message: z.string()
    .min(1, 'A mensagem é obrigatória')
    .max(5000, 'A mensagem deve ter no máximo 5000 caracteres')
    .optional()
})

// Schema para adicionar mensagem ao ticket
export const addMessageSchema = z.object({
  message: z.string()
    .min(1, 'A mensagem é obrigatória')
    .max(5000, 'A mensagem deve ter no máximo 5000 caracteres')
})

// Schema para atualizar status do ticket
export const updateStatusSchema = z.object({
  status: SupportTicketStatusEnum
})

// Schema para listar tickets (query params)
export const listTicketsSchema = z.object({
  status: SupportTicketStatusEnum.optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20)
})

// Tipos TypeScript derivados dos schemas
export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type AddMessageInput = z.infer<typeof addMessageSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type ListTicketsInput = z.infer<typeof listTicketsSchema>
export type SupportTicketStatus = z.infer<typeof SupportTicketStatusEnum>

// Tipos para responses da API
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

export interface SupportTicketWithRelations {
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
  messages: SupportTicketMessage[]
  images: SupportTicketImage[]
}

export interface SupportTicketMessage {
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

export interface SupportTicketImage {
  id: string
  imageUrl: string
  createdAt: Date
}

// Tipos para upload de imagens
export interface UploadImageResult {
  url: string
  fileName: string
}

// Tipos para paginação
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
