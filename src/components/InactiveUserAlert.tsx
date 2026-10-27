import Link from 'next/link'

interface InactiveUserAlertProps {
  onClose?: () => void
}

export default function InactiveUserAlert({ onClose }: InactiveUserAlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Conta Inativa
          </h3>
          <p className="text-red-700 mb-4">
            Sua conta está inativa. Para continuar recebendo bônus e participando da rede, 
            você precisa reativar sua conta.
          </p>
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/ativacao"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              🔄 Reativar Conta
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}