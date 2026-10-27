import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, Download, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

interface SupportTicketImage {
  id: string
  imageUrl: string
  createdAt: Date | string
}

interface SupportImageGalleryProps {
  images: SupportTicketImage[]
  className?: string
}

export const SupportImageGallery: React.FC<SupportImageGalleryProps> = ({
  images,
  className = ''
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  const closeModal = useCallback(() => {
    setSelectedImageIndex(null)
  }, [])

  const goToPrevious = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }, [selectedImageIndex])

  const goToNext = useCallback(() => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }, [selectedImageIndex, images.length])

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedImageIndex === null) return

      switch (event.key) {
        case 'Escape':
          closeModal()
          break
        case 'ArrowLeft':
          event.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          event.preventDefault()
          goToNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedImageIndex, goToNext, goToPrevious, closeModal])

  if (!images || images.length === 0) {
    return null
  }

  const openModal = (index: number) => {
    setSelectedImageIndex(index)
  }

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index))
  }

  const downloadImage = async (imageUrl: string, imageId: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `suporte-imagem-${imageId}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar imagem:', error)
    }
  }

  return (
    <>
      {/* Grid de thumbnails */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 aspect-square shadow-sm hover:shadow-md transition-shadow"
            onClick={() => openModal(index)}
          >
            {imageErrors.has(index) ? (
              // Fallback para imagem com erro
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-gray-500">
                <ImageIcon className="w-8 h-8 mb-2" />
                <p className="text-xs text-center px-2">Erro ao carregar imagem</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(image.imageUrl, '_blank')
                  }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Abrir em nova aba
                </button>
              </div>
            ) : (
              <>
                <Image
                  src={image.imageUrl}
                  alt={`Imagem ${index + 1} do ticket`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  onError={() => handleImageError(index)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white bg-opacity-90 rounded-full p-2 shadow-lg">
                      <Download className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>
                </div>
                {/* Indicador de zoom */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black bg-opacity-50 rounded-full p-1">
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Modal fullscreen */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Botão fechar */}
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 z-20 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-3 transition-all duration-200 backdrop-blur-sm"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Botão anterior */}
            {images.length > 1 && selectedImageIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-3 transition-all duration-200 backdrop-blur-sm"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Botão próximo */}
            {images.length > 1 && selectedImageIndex < images.length - 1 && (
              <button
                onClick={goToNext}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-3 transition-all duration-200 backdrop-blur-sm"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Imagem principal */}
            <div className="relative w-full h-full flex items-center justify-center p-8">
              <div className="relative max-w-full max-h-full">
                {imageErrors.has(selectedImageIndex) ? (
                  <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-8 max-w-md max-h-md">
                    <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-white text-lg mb-4">Erro ao carregar imagem</p>
                    <button
                      onClick={() => window.open(images[selectedImageIndex].imageUrl, '_blank')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Abrir em nova aba
                    </button>
                  </div>
                ) : (
                  <Image
                    src={images[selectedImageIndex].imageUrl}
                    alt={`Imagem ${selectedImageIndex + 1} do ticket`}
                    width={1200}
                    height={800}
                    className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    style={{
                      maxWidth: 'calc(100vw - 4rem)',
                      maxHeight: 'calc(100vh - 8rem)'
                    }}
                    priority
                    onError={() => handleImageError(selectedImageIndex)}
                  />
                )}
              </div>
            </div>

            {/* Contador de imagens */}
            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 rounded-full px-4 py-2 backdrop-blur-sm z-20">
                <span className="text-white text-sm font-medium">
                  {selectedImageIndex + 1} / {images.length}
                </span>
              </div>
            )}

            {/* Botão download */}
            <button
              onClick={() => downloadImage(images[selectedImageIndex].imageUrl, images[selectedImageIndex].id)}
              className="absolute bottom-6 right-6 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-3 transition-all duration-200 backdrop-blur-sm z-20"
            >
              <Download className="w-6 h-6 text-white" />
            </button>

            {/* Instruções */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 rounded-full px-4 py-2 backdrop-blur-sm z-20">
              <span className="text-white text-sm">
                {images.length > 1 ? 'Use as setas para navegar • ESC para fechar' : 'ESC para fechar'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SupportImageGallery
