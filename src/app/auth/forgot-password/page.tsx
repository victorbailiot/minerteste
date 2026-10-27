import { Suspense } from 'react'
import ForgotPasswordPage from '../../../components/ForgotPasswordPage'

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ForgotPasswordPage />
    </Suspense>
  )
} 