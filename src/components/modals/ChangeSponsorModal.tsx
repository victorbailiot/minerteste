'use client'

import { useState, useEffect } from 'react'
import { Search, X, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Sponsor {
  id: number
  name: string
  email: string
  referralCode: string
}

interface ChangeSponsorModalProps {
  isOpen: boolean
  onClose: () => void
  currentSponsor: Sponsor | null
  onConfirm: (newSponsorId: number, newSponsorName: string) => void
}

const ChangeSponsorModal: React.FC<ChangeSponsorModalProps> = ({
  isOpen,
  onClose,
  currentSponsor,
  onConfirm
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Sponsor[]>([])
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSearchResults([])
      setSelectedSponsor(null)
    }
  }, [isOpen])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um nome para pesquisar')
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/admin/users/search?query=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data)
        if (data.data.length === 0) {
          toast.info('Nenhum usuário encontrado')
        }
      } else {
        toast.error('Erro ao pesquisar usuários')
      }
    } catch (error) {
      console.error('Erro ao pesquisar:', error)
      toast.error('Erro ao pesquisar usuários')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelectSponsor = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor)
  }

  const handleContinue = () => {
    if (!selectedSponsor) {
      toast.error('Selecione um novo patrocinador')
      return
    }

    if (selectedSponsor.id === currentSponsor?.id) {
      toast.error('O novo patrocinador não pode ser o mesmo que o atual')
      return
    }

    onConfirm(selectedSponsor.id, selectedSponsor.name)
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Trocar Rede</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal"
            tabIndex={0}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Patrocinador Atual */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">Patrocinador Atual</h3>
            {currentSponsor ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-blue-600">Nome</p>
                  <p className="font-medium">{currentSponsor.name}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-600">Código</p>
                  <p className="font-medium">{currentSponsor.referralCode}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Este usuário não possui patrocinador</p>
            )}
          </div>

          {/* Pesquisar Novo Patrocinador */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Pesquisar Novo Patrocinador</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o nome do novo patrocinador"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                tabIndex={0}
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Pesquisando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Pesquisar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resultados da Pesquisa */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Resultados ({searchResults.length})</h3>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {searchResults.map((sponsor) => (
                  <button
                    key={sponsor.id}
                    onClick={() => handleSelectSponsor(sponsor)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0 ${
                      selectedSponsor?.id === sponsor.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{sponsor.name}</p>
                        <p className="text-sm text-gray-500 truncate">{sponsor.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Código</p>
                        <p className="font-medium text-sm">{sponsor.referralCode}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Patrocinador Selecionado */}
          {selectedSponsor && (
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Novo Patrocinador Selecionado</h3>
                  <p className="text-sm text-green-700">Este será o novo patrocinador do usuário</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white rounded p-3">
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="font-medium">{selectedSponsor.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-sm">{selectedSponsor.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Código</p>
                  <p className="font-medium">{selectedSponsor.referralCode}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            tabIndex={0}
          >
            Cancelar
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedSponsor}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            tabIndex={0}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangeSponsorModal

