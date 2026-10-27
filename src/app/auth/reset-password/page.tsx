import { Suspense } from 'react'
import ResetPasswordPage from '../../../components/ResetPasswordPage'

// Forçar renderização dinâmica para evitar erro de build
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordPage />
    </Suspense>
  )
} 