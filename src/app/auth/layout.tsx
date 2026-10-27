import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autenticação - TectonMiner',
  description: 'Sistema de autenticação do TectonMiner - Login e Registro',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  )
} 