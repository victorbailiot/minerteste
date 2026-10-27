'use client'

import React from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Modal from '@/components/ui/modal'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'success'
  isLoading?: boolean
  /** Conteúdo extra exibido abaixo da mensagem (ex.: opções da confirmação) */
  children?: React.ReactNode
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  isLoading = false,
  children
}: ConfirmationModalProps) {
  const getIconAndColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <XCircle className="w-8 h-8 text-red-500" />,
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
          borderClass: 'border-red-200'
        }
      case 'success':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          confirmButtonClass: 'bg-green-600 hover:bg-green-700 text-white',
          borderClass: 'border-green-200'
        }
      default: // warning
        return {
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
          confirmButtonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          borderClass: 'border-yellow-200'
        }
    }
  }

  const { icon, confirmButtonClass, borderClass } = getIconAndColors()

  const handleConfirm = () => {
    onConfirm()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConfirm()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-md"
      footerButtons={
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            onKeyDown={handleKeyDown}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processando...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      }
    >
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {icon}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <p className="text-gray-600">
            {message}
          </p>
        </div>

        {children}
      </div>
    </Modal>
  )
}
