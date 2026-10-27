import ForgotFinancialPasswordPage from '@/components/ForgotFinancialPasswordPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recuperar Senha Financeira - MinerStone',
  description: 'Solicite a recuperação da sua senha financeira',
}

export default function Page() {
  return <ForgotFinancialPasswordPage />
}

