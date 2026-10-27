'use client'

import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface MinerOption {
  id: number
  name: string
}

interface PackageInfo {
  id: number
  name: string
  minerId: number | null
  minerName: string | null
}

interface ChangePackageMinerModalProps {
  isOpen: boolean
  onClose: () => void
  packageInfo: PackageInfo | null
  onConfirm: (packageId: number, minerId: number | null) => Promise<void>
  isLoading?: boolean
}

const ChangePackageMinerModal: React.FC<ChangePackageMinerModalProps> = ({
  isOpen,
  onClose,
  packageInfo,
  onConfirm,
  isLoading = false
}) => {
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [loadingMiners, setLoadingMiners] = useState(false)
  const [selectedMinerId, setSelectedMinerId] = useState<string>('')

  const loadMiners = useCallback(async () => {
    try {
      setLoadingMiners(true)
      const response = await fetch('/api/admin/miners?limit=100')
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao carregar mineradoras')
      }

      const mappedMiners = (result.data || []).map((miner: { id: string; name: string }) => ({
        id: Number(miner.id),
        name: miner.name
      }))

      setMiners(mappedMiners)
    } catch (error) {
      console.error('Erro ao carregar mineradoras:', error)
      toast.error('Erro ao carregar mineradoras')
    } finally {
      setLoadingMiners(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setSelectedMinerId('')
      return
    }

    loadMiners()
  }, [isOpen, loadMiners])

  useEffect(() => {
    if (!isOpen || !packageInfo) return
    setSelectedMinerId(packageInfo.minerId ? packageInfo.minerId.toString() : '')
  }, [isOpen, packageInfo])

  const handleSubmit = async () => {
    if (!packageInfo) return

    const minerId = selectedMinerId ? Number(selectedMinerId) : null

    if (minerId === packageInfo.minerId) {
      toast.info('Selecione uma mineradora diferente da atual')
      return
    }

    await onConfirm(packageInfo.id, minerId)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading && !loadingMiners) {
      handleSubmit()
    }
  }

  if (!isOpen || !packageInfo) return null

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Alterar Mineradora</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal"
            tabIndex={0}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Pacote</p>
            <p className="font-semibold text-gray-900">{packageInfo.name}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700">Mineradora atual</p>
            <p className="font-semibold text-blue-900">
              {packageInfo.minerName ?? 'Não vinculada'}
            </p>
          </div>

          <div>
            <label htmlFor="package-miner-select" className="block text-sm font-medium text-gray-700 mb-2">
              Nova mineradora
            </label>
            <select
              id="package-miner-select"
              value={selectedMinerId}
              onChange={(event) => setSelectedMinerId(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loadingMiners || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:opacity-50"
              aria-label="Selecionar nova mineradora"
              tabIndex={0}
            >
              <option value="">
                {loadingMiners ? 'Carregando mineradoras...' : 'Não vinculada'}
              </option>
              {miners.map((miner) => (
                <option key={miner.id} value={miner.id}>
                  {miner.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || loadingMiners}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangePackageMinerModal
