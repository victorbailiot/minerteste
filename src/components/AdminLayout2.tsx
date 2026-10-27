'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface AdminLayoutProps {
  children: ReactNode
}

interface MenuItem {
  id: string
  label: string
  icon: string
  href: string
  badge?: string
}

// Componentes de ícones SVG para admin
const DashboardIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
)

const PackagesIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2L3 7v11l7-5 7 5V7l-7-5zM10 4.414L6.414 7 10 9.586 13.586 7 10 4.414z" clipRule="evenodd" />
  </svg>
)

const TransactionsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
)

const ReportsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
)

const WithdrawalsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
  </svg>
)

const BonusIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
)

const ParametersIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
  </svg>
)

const BackIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
)

const SimulatorIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LogsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
  </svg>
)

const FinancialIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="8" />
    <path d="M14.5 9h-2.5a2 2 0 100 4h2a2 2 0 110 4h-4" />
    <path d="M12 7v2" />
    <path d="M12 15v2" />
  </svg>
)

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'DashboardIcon',
    href: '/admin'
  },
  {
    id: 'users',
    label: 'Usuários',
    icon: 'UsersIcon',
    href: '/admin/usuarios'
  },
  {
    id: 'packages',
    label: 'Pacotes',
    icon: 'PackagesIcon',
    href: '/admin/pacotes'
  },
  {
    id: 'transactions',
    label: 'Transações',
    icon: 'TransactionsIcon',
    href: '/admin/transacoes'
  },
  {
    id: 'withdrawals',
    label: 'Saques',
    icon: 'WithdrawalsIcon',
    href: '/admin/saques',
    badge: 'new'
  },
  {
    id: 'bonus',
    label: 'Monitoramento de Bônus',
    icon: 'BonusIcon',
    href: '/admin/bonus'
  },
  {
    id: 'financial',
    label: 'Financeiro',
    icon: 'FinancialIcon',
    href: '/admin/financial'
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: 'ReportsIcon',
    href: '/admin/relatorios'
  },
  {
    id: 'parameters',
    label: 'Parâmetros',
    icon: 'ParametersIcon',
    href: '/admin/parametros'
  },
  /*{
    id: 'simulator',
    label: 'Simulador de Bonificações',
    icon: 'SimulatorIcon',
    href: '/admin/simulador'
  },*/
  {
    id: 'logs',
    label: 'Logs do Sistema',
    icon: 'LogsIcon',
    href: '/admin/logs'
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: 'SettingsIcon',
    href: '/admin/configuracoes'
  },
  {
    id: 'back',
    label: 'Voltar ao Dashboard',
    icon: 'BackIcon',
    href: '/dashboard'
  }
]

const iconComponents = {
  DashboardIcon,
  UsersIcon,
  PackagesIcon,
  TransactionsIcon,
  WithdrawalsIcon,
  BonusIcon,
  ReportsIcon,
  ParametersIcon,
  SimulatorIcon,
  LogsIcon,
  SettingsIcon,
  BackIcon,
  FinancialIcon
}

export default function AdminLayout2({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch (err) {
      console.error('Erro no logout:', err)
      router.push('/auth/login')
    }
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href) && href !== '#'
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar Admin - Cores grafite */}
        <div className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-gray-800 via-gray-700 to-slate-800 transition-all duration-300 shadow-xl ${sidebarOpen ? 'w-64' : 'w-16'
          }`}>
          {/* Header da Sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-600/30">
            <div className={`flex items-center space-x-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-gray-700 font-bold text-xl">A</span>
              </div>
              {sidebarOpen && (
                <span className="text-white font-bold text-xl tracking-wide">Admin</span>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="text-white hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                title="Fechar menu"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Menu Items */}
          <nav className="mt-6 h-full">
            <div className="px-4 mb-4">
              {sidebarOpen && (
                <span className="text-white text-xs uppercase tracking-wider font-semibold">
                  Painel Administrativo
                </span>
              )}
            </div>

            {/* Adicionado container com overflow-y-auto para permitir rolagem */}
            <div className="h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pr-1">
              <ul className="space-y-1 px-2.5">
                {menuItems.map((item) => {
                  const IconComponent = iconComponents[item.icon as keyof typeof iconComponents]
                  const isBackButton = item.id === 'back'
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 group ${isActive(item.href)
                          ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/20'
                          : isBackButton
                            ? 'text-white hover:bg-white/5 hover:text-white mt-3 border-t border-white/20 pt-3'
                            : 'text-white hover:bg-white/10 hover:text-white'
                          } ${!sidebarOpen && 'justify-center'}`}
                      >
                        <div className="text-white group-hover:text-white transition-colors">
                          <IconComponent />
                        </div>
                        {sidebarOpen && (
                          <div className="flex items-center justify-between w-full">
                            <span className={`font-medium text-white text-sm`}>
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>
        </div>

        {/* Botão de toggle quando sidebar fechada */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-50 bg-gray-700 text-white p-3 rounded-xl shadow-lg hover:bg-gray-800 transition-all duration-200"
            title="Abrir menu"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Conteúdo Principal */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-800">
                  Painel Administrativo
                </h1>
                <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-semibold">
                  ADMIN
                </span>
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-lg p-2"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">A</span>
                  </div>
                  <span className="font-medium">Admin</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 mb-3 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Área do Usuário
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Conteúdo da Página */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  )
} 