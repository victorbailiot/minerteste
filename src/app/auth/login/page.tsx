import { Suspense } from 'react'
import LoginPage from '../../../components/LoginPage'

// Forçar renderização dinâmica para evitar erro de build
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginPage />
    </Suspense>
  )
}