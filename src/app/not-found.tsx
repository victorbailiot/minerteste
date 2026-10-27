import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Página não encontrada
          </h2>
          <p className="text-gray-500 mb-8">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para o início
          </Link>
          
          <div className="text-sm text-gray-400">
            <Link href="/auth/login" className="hover:text-gray-600">
              Fazer login
            </Link>
            {' • '}
            <Link href="/auth/register" className="hover:text-gray-600">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 