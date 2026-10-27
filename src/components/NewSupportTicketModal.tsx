import React, { useState, useRef } from 'react'
import { X, Upload, Image as ImageIcon, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface NewSupportTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (ticket: any) => void
}

export const NewSupportTicketModal: React.FC<NewSupportTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Validar número máximo de imagens
    if (images.length + files.length > 5) {
      toast.error('Máximo de 5 imagens por ticket')
      return
    }

    // Validar tipos de arquivo
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`Arquivo ${file.name} não é uma imagem válida`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Imagem ${file.name} deve ter no máximo 5MB`)
        return false
      }
      return true
    })

    setImages(prev => [...prev, ...validFiles])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim()) {
      toast.error('O assunto é obrigatório')
      return
    }

    if (!message.trim()) {
      toast.error('A mensagem é obrigatória')
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('subject', subject.trim())
      formData.append('message', message.trim())
      
      images.forEach(image => {
        formData.append('images', image)
      })

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar ticket')
      }

      toast.success('Ticket criado com sucesso!')
      onSuccess(data.ticket)
      
      // Limpar formulário
      setSubject('')
      setMessage('')
      setImages([])
      onClose()

    } catch (error) {
      console.error('Erro ao criar ticket:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar ticket')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSubject('')
      setMessage('')
      setImages([])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/45 bg-opacity-50" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Novo Ticket de Suporte
            </h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Assunto */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Assunto *
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Descreva brevemente o problema"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={255}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {subject.length}/255 caracteres
              </p>
            </div>

            {/* Mensagem */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição do Problema *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva detalhadamente o problema que você está enfrentando..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={5000}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length}/5000 caracteres
              </p>
            </div>

            {/* Upload de Imagens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagens (opcional)
              </label>
              
              {/* Botão de upload */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || images.length >= 5}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Adicionar Imagens
                </button>
                <span className="text-sm text-gray-500">
                  {images.length}/5 imagens
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isLoading}
              />

              {/* Preview das imagens */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                        <Image
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white bg-opacity-90 rounded-full p-2">
                              <X className="w-4 h-4 text-red-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        disabled={isLoading}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate px-1">
                        {image.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Máximo 5 imagens, 5MB cada. Formatos aceitos: JPG, PNG, GIF
              </p>
            </div>
          </form>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !subject.trim() || !message.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Criar Ticket
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewSupportTicketModal
