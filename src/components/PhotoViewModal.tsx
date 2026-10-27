'use client'

import { X, Download } from 'lucide-react'
import Image from 'next/image'

interface PhotoViewModalProps {
  isOpen: boolean
  onClose: () => void
  photoUrl: string | null
  userName: string
}

const PhotoViewModal: React.FC<PhotoViewModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  userName
}) => {
  if (!isOpen) return null

  const handleDownload = async () => {
    if (!photoUrl) return

    try {
      // Verificar se é uma URL válida
      if (!photoUrl.startsWith('http')) {
        throw new Error('URL inválida')
      }

      // Usar o proxy da API para evitar problemas de CORS
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(photoUrl)}`
      
      // Buscar a imagem através do proxy
      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      
      // Verificar se é uma imagem válida
      if (!blob.type.startsWith('image/')) {
        throw new Error('Arquivo não é uma imagem válida')
      }
      
      // Criar URL temporária
      const url = window.URL.createObjectURL(blob)
      
      // Criar link temporário e fazer download
      const link = document.createElement('a')
      link.href = url
      link.download = `foto-${userName.replace(/\s+/g, '-').toLowerCase()}.jpg`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      
      // Limpar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar foto:', error)
      
      // Fallback: tentar abrir em nova aba para download manual
      try {
        window.open(photoUrl, '_blank')
        alert('Não foi possível baixar automaticamente. A foto foi aberta em nova aba para download manual.')
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError)
        alert('Erro ao baixar a foto. Verifique se a URL está acessível.')
      }
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ')
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase()
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

  return (
    <div
      className="fixed inset-0 bg-black/45 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">
            Foto de {userName}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Foto */}
        <div className="p-3 flex-1 overflow-hidden flex items-center justify-center">
          <div className="relative w-80 h-80 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={`Foto de ${userName}`}
                width={320}
                height={320}
                className="w-full h-full object-cover"
                sizes="320px"
                priority
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center rounded-lg">
                <span className="text-white text-5xl font-bold">
                  {getInitials(userName)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer com botão de download */}
        {photoUrl && (
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleDownload}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Salvar Foto</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PhotoViewModal

