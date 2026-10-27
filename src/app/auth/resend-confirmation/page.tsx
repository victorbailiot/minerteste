import { Suspense } from 'react'
import ResendConfirmationPage from '../../../components/ResendConfirmationPage'

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResendConfirmationPage />
    </Suspense>
  )
} 