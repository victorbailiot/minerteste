'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'
import CartIcon from './CartIcon'
import UserProfilePhoto from './UserProfilePhoto'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Briefcase, 
  Package, 
  DollarSign, 
  Zap, 
  Ticket, 
  Coins,
  User, 
  Shield,
  MessageCircle,
  Calculator,
  ShoppingBag,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  type LucideIcon
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

interface SubMenuItem {
  id: string
  label: string
  icon: LucideIcon
  href: string
}

interface MenuItem {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  badge?: string
  adminOnly?: boolean
  submenu?: SubMenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard'
  },
  {
    id: 'earnings',
    label: 'Bônus',
    icon: DollarSign,
    href: '/dashboard/bonus'
  },
  {
    id: 'plans',
    label: 'Cotas',
    icon: Package,
    href: '/dashboard/minhas-cotas'
  },
  {
    id: 'store-menu',
    label: 'Loja',
    icon: ShoppingBag,
    submenu: [
      {
        id: 'store',
        label: 'Produtos',
        icon: ShoppingBag,
        href: '/dashboard/loja'
      },
      {
        id: 'orders',
        label: 'Meus Pedidos',
        icon: ShoppingCart,
        href: '/dashboard/pedidos'
      }
    ]
  },
  {
    id: 'business',
    label: 'Meu Negócio',
    icon: Briefcase,
    href: '/dashboard/meu-negocio'
  },
  {
    id: 'simulator',
    label: 'Simulador',
    icon: Calculator,
    href: '/dashboard/simulador'
  },
  {
    id: 'activation',
    label: 'Ativação',
    icon: Zap,
    href: '/dashboard/ativacao'
  },
  {
    id: 'credito-minerador',
    label: 'Crédito Minerador',
    icon: Coins,
    href: '/dashboard/credito-minerador'
  },
  {
    id: 'coupons',
    label: 'Meus Cupons',
    icon: Ticket,
    href: '/dashboard/cupons'
  },
  {
    id: 'support',
    label: 'Suporte',
    icon: MessageCircle,
    href: '/dashboard/suporte'
  },
  {
    id: 'profile',
    label: 'Perfil',
    icon: User,
    href: '/dashboard/perfil'
  },
  {
    id: 'admin',
    label: 'Área Admin',
    icon: Shield,
    href: '/admin',
    badge: 'ADMIN',
    adminOnly: true
  }
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth()
  const { hasPermission } = usePermissions()

  // Verificar se tem permissão para acessar admin
  const canAccessAdmin = hasPermission('dashboard.admin') || isAdmin

  // Expandir automaticamente submenu que contém a rota ativa
  useEffect(() => {
    const newExpandedMenus: Record<string, boolean> = {}
    menuItems.forEach((item) => {
      if (item.submenu) {
        const hasActiveSubmenu = item.submenu.some(subitem => 
          pathname === subitem.href || pathname.startsWith(subitem.href + '/')
        )
        if (hasActiveSubmenu) {
          newExpandedMenus[item.id] = true
        }
      }
    })
    setExpandedMenus(prev => ({ ...prev, ...newExpandedMenus }))
  }, [pathname])

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  // Debug log (remover em produção)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 DashboardLayout debug:', {
      isAuthenticated,
      isLoading,
      isAdmin,
      hasDashboardAdminPermission: hasPermission('dashboard.admin'),
      canAccessAdmin,
      user: user?.email,
      hasMenuAdminItem: menuItems.some(item => item.adminOnly)
    })
  }

  // Carregar estado do sidebar do localStorage ao inicializar
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen')
    if (savedSidebarState !== null) {
      setSidebarOpen(JSON.parse(savedSidebarState))
    }
  }, [])

  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)

      // Em telas maiores, sidebar fica aberta por padrão (ou restaura do localStorage)
      // Em telas menores, sidebar fica fechada por padrão
      if (mobile) {
        setSidebarOpen(false)
      } else {
        // Restaurar estado salvo ou usar true como padrão
        const savedSidebarState = localStorage.getItem('sidebarOpen')
        if (savedSidebarState !== null) {
          setSidebarOpen(JSON.parse(savedSidebarState))
        } else {
          setSidebarOpen(true)
        }
      }
    }

    // Verificar no carregamento inicial
    checkIfMobile()

    // Adicionar listener para redimensionamento
    window.addEventListener('resize', checkIfMobile)

    // Limpar listener
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  // Fechar menu do usuário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (userMenuOpen && !target.closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const toggleSidebar = () => {
    const newState = !sidebarOpen
    setSidebarOpen(newState)

    // Salvar estado no localStorage apenas se não for dispositivo móvel
    localStorage.setItem('sidebarOpen', JSON.stringify(newState))
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href) && href !== '#'
  }

  // Se ainda está carregando, mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Se não está autenticado, não mostrar o layout
  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">

        {/* Sidebar - visível em desktop, oculto em mobile até ser ativado */}
        <div className={`fixed left-0 z-50 bg-gradient-to-b from-blue-700 via-blue-600 to-blue-800 transition-all duration-300 shadow-xl ${isMobile
          ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full')
          : 'translate-x-0'
          } ${isMobile ? 'w-64' : (sidebarOpen ? 'w-64' : 'w-16')} inset-y-0`}>
          {/* Header da Sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-blue-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ">
              <Image
                  src="/images/simbolo-minerstone.png"
                  alt="MinerStone Logo"
                  width={100}
                  height={100}
                  className="object-contain relative z-10"
                  priority
                />
              </div>
              {(sidebarOpen || isMobile) && (
                <Image
                  src="/images/logo-minerstone-text.png"
                  alt="MinerStone Logo"
                  width={150}
                  height={150}
                  className="object-contain relative z-10"
                  priority
                />
              )}
            </div>
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-lg text-white hover:bg-blue-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Menu Items */}
          <nav className="mt-6 px-3">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                // Filtrar itens admin se não tiver permissão ou não for admin
                if (item.adminOnly && !canAccessAdmin) {
                  // Debug log (remover em produção)
                  if (process.env.NODE_ENV === 'development') {
                    console.log('🔍 Menu item filtrado:', {
                      item: item.label,
                      adminOnly: item.adminOnly,
                      isAdmin,
                      hasDashboardAdminPermission: hasPermission('dashboard.admin'),
                      canAccessAdmin,
                      user: user?.email
                    })
                  }
                  return null
                }

                const IconComponent = item.icon
                const hasSubmenu = item.submenu && item.submenu.length > 0
                const isExpanded = expandedMenus[item.id]
                
                // Para itens com submenu, verificar se algum submenu está ativo
                const active = hasSubmenu 
                  ? item.submenu!.some(subitem => isActive(subitem.href))
                  : item.href ? isActive(item.href) : false

                return (
                  <li key={item.id}>
                    {hasSubmenu ? (
                      // Item com submenu
                      <>
                        <button
                          onClick={() => toggleSubmenu(item.id)}
                          className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 group ${
                            active
                              ? 'bg-white/20 text-white shadow-lg'
                              : 'text-blue-100 hover:bg-white/10 hover:text-white'
                          } ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
                        >
                          <IconComponent className="w-5 h-5" />
                          {(sidebarOpen || isMobile) && (
                            <>
                              <span className="ml-3 flex-1 text-left">
                                {item.label}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </>
                          )}
                        </button>
                        
                        {/* Submenu */}
                        {(sidebarOpen || isMobile) && isExpanded && (
                          <ul className="mt-1 ml-4 space-y-1">
                            {item.submenu!.map((subitem) => {
                              const SubIconComponent = subitem.icon
                              const subActive = isActive(subitem.href)
                              
                              return (
                                <li key={subitem.id}>
                                  <Link
                                    href={subitem.href}
                                    onClick={() => isMobile && setSidebarOpen(false)}
                                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 group ${
                                      subActive
                                        ? 'bg-white/30 text-white shadow-md'
                                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    <SubIconComponent className="w-4 h-4" />
                                    <span className="ml-3 text-sm">
                                      {subitem.label}
                                    </span>
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </>
                    ) : (
                      // Item sem submenu (normal)
                      <Link
                        href={item.href!}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 group ${
                          active
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-blue-100 hover:bg-white/10 hover:text-white'
                        } ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
                      >
                        <IconComponent className="w-5 h-5" />
                        {(sidebarOpen || isMobile) && (
                          <span className="ml-3 flex-1 flex items-center justify-between">
                            {item.label}
                            {item.badge && (
                              <span className="px-2 py-1 text-xs bg-yellow-500 text-yellow-900 rounded-full font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarOpen ? (isMobile ? 'ml-0' : 'ml-64') : (isMobile ? 'ml-0' : 'ml-16')}`}>
          {/* Top Header - fixo no topo em todos os dispositivos */}
          <header className={`fixed  right-0 z-40 bg-white shadow-sm border-b border-gray-200 top-0 transition-all duration-300 ${sidebarOpen ? (isMobile ? 'left-0' : 'left-64') : (isMobile ? 'left-0' : 'left-16')}`}>
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                {/* Menu hambúrguer visível apenas em mobile */}
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Menu"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" clipRule="evenodd" />
                  </svg>
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              </div>

              {/* User Menu */}
              <div className="relative flex items-center space-x-4 user-menu-container">
                {/* Carrinho da Loja */}
                <CartIcon />

                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <UserProfilePhoto 
                    userName={user?.name}
                    size="sm"
                  />
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name?.split(' ')[0]}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name?.split(' ')[0]}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content - com padding-top adicional para compensar o header fixo */}
          <main className={`p-4 pt-24`}>
            {children}
          </main>
        </div>

        {/* Overlay para fechar menu em mobile */}
        {sidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-black/45 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </>
  )
} 