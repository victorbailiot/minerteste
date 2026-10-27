'use client'

import React, { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import ReactCrop, { type Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Upload, X, Check, Loader2 } from 'lucide-react'

interface ImageCropUploadProps {
  onUploadComplete: (photoUrl: string) => void
  currentPhotoUrl?: string
}

const ImageCropUpload: React.FC<ImageCropUploadProps> = ({
  onUploadComplete,
  currentPhotoUrl,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    
    // Calcular o tamanho do crop baseado na menor dimensão da imagem exibida
    const size = Math.min(width, height)
    
    // Centralizar o crop
    const x = (width - size) / 2
    const y = (height - size) / 2

    setCrop({
      unit: 'px',
      x,
      y,
      width: size,
      height: size,
    })
  }, [])

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Não foi possível criar o contexto do canvas')
      }

      // Define o tamanho do canvas para 400x400 (tamanho final da foto)
      const outputSize = 400
      canvas.width = outputSize
      canvas.height = outputSize

      // Configurar contexto para melhor qualidade
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Limpar canvas com fundo branco (para evitar transparência)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, outputSize, outputSize)

      // Calcular a proporção entre a imagem exibida e a imagem natural
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Aplicar a escala às coordenadas do crop
      const sourceX = Math.round(pixelCrop.x * scaleX)
      const sourceY = Math.round(pixelCrop.y * scaleY)
      const sourceWidth = Math.round(pixelCrop.width * scaleX)
      const sourceHeight = Math.round(pixelCrop.height * scaleY)

      // Desenhar a imagem cortada como quadrada (sem máscara circular)
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputSize,
        outputSize
      )

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Falha ao criar blob da imagem'))
            return
          }
          resolve(blob)
        }, 'image/jpeg', 0.95)
      })
    },
    []
  )

  const handleUpload = async () => {
    if (!completedCrop || !imageRef.current) {
      setError('Por favor, ajuste o recorte da imagem')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const croppedBlob = await getCroppedImg(imageRef.current, completedCrop)
      const formData = new FormData()
      formData.append('photo', croppedBlob, 'profile-photo.jpg')

      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer upload da foto')
      }

      onUploadComplete(data.photoUrl)
      setSelectedImage(null)
      setCrop(undefined)
      setCompletedCrop(undefined)
    } catch (err) {
      console.error('Erro no upload:', err)
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload da foto')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedImage(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSelectClick = () => {
    fileInputRef.current?.click()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleSelectClick()
    }
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Selecionar foto de perfil"
      />

      {!selectedImage ? (
        <div className="space-y-4">
          {currentPhotoUrl && (
            <div className="flex justify-center">
              <div className="relative w-40 h-40">
                <Image
                  src={currentPhotoUrl}
                  alt="Foto de perfil atual"
                  fill
                  className="rounded-full object-cover border-4 border-gray-200"
                  sizes="160px"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSelectClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Selecionar nova foto"
          >
            <Upload className="w-5 h-5" />
            {currentPhotoUrl ? 'Alterar Foto de Perfil' : 'Adicionar Foto de Perfil'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-4">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={selectedImage}
                alt="Imagem selecionada"
                onLoad={onImageLoad}
                className="max-w-full h-auto"
              />
            </ReactCrop>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Ajuste o recorte para criar uma foto quadrada
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Cancelar"
            >
              <X className="w-5 h-5" />
              Cancelar
            </button>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-300"
              aria-label="Confirmar upload"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Confirmar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}

export default ImageCropUpload

