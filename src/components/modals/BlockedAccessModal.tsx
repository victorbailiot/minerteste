'use client'

import React from 'react'
import { ShieldX, AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/modal'

interface BlockedAccessModalProps {
  isOpen: boolean
  onClose: () => void
  reason: string
}

export default function BlockedAccessModal({
  isOpen,
  onClose,
  reason
}: BlockedAccessModalProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-md"
      footerButtons={
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={onClose}
            onKeyDown={handleKeyDown}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            tabIndex={0}
            aria-label="Entendido"
            autoFocus
          >
            Entendido
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center space-y-4" onKeyDown={handleKeyDown}>
        {/* Ícone de bloqueio */}
        <div className="relative">
          <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50" />
          <div className="relative bg-red-50 p-4 rounded-full border-2 border-red-200">
            <ShieldX className="w-12 h-12 text-red-500" />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">
            Acesso Bloqueado
          </h3>
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <span>Você está temporariamente impedido de usar esta funcionalidade</span>
          </div>
        </div>

        {/* Motivo do bloqueio */}
        <div className="w-full">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
            <p className="text-sm font-medium text-amber-800 mb-1">
              Motivo do bloqueio:
            </p>
            <p className="text-sm text-amber-700 leading-relaxed">
              {reason}
            </p>
          </div>
        </div>

        {/* Informação adicional */}
        <p className="text-xs text-gray-500 mt-2">
          Se você acredita que isso é um erro, entre em contato com o suporte.
        </p>
      </div>
    </Modal>
  )
}
