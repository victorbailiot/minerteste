'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import ImageCropUpload from './ImageCropUpload'

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: (photoUrl: string) => void
  currentPhotoUrl?: string
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  currentPhotoUrl,
}) => {
  const [isUploading, setIsUploading] = useState(false)

  const handleUploadComplete = (photoUrl: string) => {
    setIsUploading(true)
    onUploadComplete(photoUrl)
    // Fechar modal após um pequeno delay para mostrar o sucesso
    setTimeout(() => {
      setIsUploading(false)
      onClose()
    }, 1000)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentPhotoUrl ? 'Alterar Foto de Perfil' : 'Adicionar Foto de Perfil'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Selecione uma imagem e ajuste o recorte para criar uma foto quadrada. 
              A imagem será redimensionada para 400x400 pixels.
            </p>
          </div>

          <ImageCropUpload
            onUploadComplete={handleUploadComplete}
            currentPhotoUrl={currentPhotoUrl}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default PhotoUploadModal
