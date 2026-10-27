'use client'

import React, { useState, useEffect } from 'react'
import { X, Package, Loader2, CheckCircle } from 'lucide-react'

interface UnilevelPackage {
    id: string
    name: string
    price: string
    points: number
    directBonus: string
    profitSharePercent: string
    reactivationAmount: string
    reactivationBonus: string
}

interface GeneratePackageModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    userName: string
    onSuccess: () => void
}

const GeneratePackageModal: React.FC<GeneratePackageModalProps> = ({
    isOpen,
    onClose,
    userId,
    userName,
    onSuccess
}) => {
    const [packages, setPackages] = useState<UnilevelPackage[]>([])
    const [selectedPackageId, setSelectedPackageId] = useState<string>('')
    const [quantity, setQuantity] = useState<number>(1)
    const [excludeFromPoints, setExcludeFromPoints] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string>('')
    const [success, setSuccess] = useState<string>('')

    // Buscar pacotes unilevel disponíveis e resetar quantidade
    useEffect(() => {
        if (isOpen) {
            setQuantity(1)
            fetchPackages()
        }
    }, [isOpen])

    const fetchPackages = async () => {
        try {
            setIsLoading(true)
            setError('')

            const response = await fetch('/api/admin/unilevel/packages')
            const data = await response.json()

            if (data.success) {
                setPackages(data.data)
            } else {
                setError(data.error || 'Erro ao carregar pacotes')
            }
        } catch (error) {
            console.error('Erro ao buscar pacotes:', error)
            setError('Erro ao carregar pacotes')
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerate = async () => {
        if (!selectedPackageId) {
            setError('Selecione um pacote')
            return
        }

        const qty = Number.isFinite(quantity) ? Math.floor(quantity) : 0
        if (qty < 1 || qty > 100) {
            setError('Informe uma quantidade entre 1 e 100')
            return
        }

        try {
            setIsGenerating(true)
            setError('')
            setSuccess('')

            const response = await fetch('/api/admin/unilevel/generate-package', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    packageId: selectedPackageId,
                    quantity: qty,
                    excludeFromPoints: excludeFromPoints
                })
            })

            const data = await response.json()

            if (data.success) {
                setSuccess(data.message)
                setTimeout(() => {
                    onSuccess()
                    onClose()
                }, 2000)
            } else {
                setError(data.error || 'Erro ao gerar pacote')
            }
        } catch (error) {
            console.error('Erro ao gerar pacote:', error)
            setError('Erro ao gerar pacote')
        } finally {
            setIsGenerating(false)
        }
    }

    const selectedPackage = packages.find(pkg => pkg.id === selectedPackageId)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Gerar Pacote Unilevel
                            </h2>
                            <p className="text-sm text-gray-500">
                                Ativar usuário: <span className="font-medium">{userName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isGenerating}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <span className="ml-2 text-gray-600">Carregando pacotes...</span>
                        </div>
                    ) : error && !isGenerating ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-red-800">{error}</p>
                            <button
                                onClick={fetchPackages}
                                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : success ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <p className="text-green-800">{success}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Seleção de Pacote */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Selecione o Pacote Unilevel
                                </label>

                                <div className="space-y-3">
                                    {packages.map((pkg) => (
                                        <div
                                            key={pkg.id}
                                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedPackageId === pkg.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            onClick={() => setSelectedPackageId(pkg.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 ${selectedPackageId === pkg.id
                                                            ? 'border-blue-500 bg-blue-500'
                                                            : 'border-gray-300'
                                                        }`}>
                                                        {selectedPackageId === pkg.id && (
                                                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        R$ {pkg.price}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quantidade */}
                            <div className="mb-6">
                                <label
                                    htmlFor="generate-package-quantity"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Quantidade de pacotes
                                </label>
                                <input
                                    id="generate-package-quantity"
                                    type="number"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={quantity}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value, 10)
                                        setQuantity(Number.isNaN(v) ? 1 : v)
                                    }}
                                    disabled={isGenerating}
                                    className="w-full max-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                    aria-label="Quantidade de pacotes a gerar"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Entre 1 e 100. Serão criados registros separados para cada pacote.
                                </p>
                            </div>

                            {/* Checkbox para excluir da pontuação */}
                            <div className="mb-6">
                                <label className="flex items-center space-x-3 cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={excludeFromPoints}
                                        onChange={(e) => setExcludeFromPoints(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                        disabled={isGenerating}
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">
                                            Excluir este pacote do cálculo de pontuação da rede
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Quando marcado, este pacote não será incluído na soma de pontos da rede para cálculo de progressão de carreira.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Aviso */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-yellow-800">
                                    <strong>Atenção:</strong> Esta ação irá criar um pacote ativo para o usuário sem cobrança.
                                    O pacote expirará em 1 ano e será criado um registro de pagamento simulado. Os bônus de indicação direta e indireta não serão distribuídos.
                                    Se for um pacote elegível, o usuário será adicionado ao Clube dos 300.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!selectedPackageId || isGenerating || isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Gerando...</span>
                            </>
                        ) : (
                            <>
                                <Package className="w-4 h-4" />
                                <span>Gerar Pacote</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default GeneratePackageModal
