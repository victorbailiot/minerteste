import ResetFinancialPasswordPage from '@/components/ResetFinancialPasswordPage'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Redefinir Senha Financeira - MinerStone',
  description: 'Redefina sua senha financeira usando o token de recuperação',
}

// Forçar renderização dinâmica para permitir uso de searchParams
export const dynamic = 'force-dynamic'

export default function Page() {
  return <ResetFinancialPasswordPage />
}

