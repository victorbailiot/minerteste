'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'
import CartIcon from './CartIcon'
import Image from 'next/image'
import { 
  UsersIcon, 
  LayoutDashboard, 
  Network, 
  Building2, 
  Clapperboard,
  Package, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  FileText, 
  Settings, 
  TestTube, 
  Shield, 
  CircleDot, 
  Gift, 
  BarChart3, 
  Sliders, 
  Calculator, 
  FileCheck, 
  ArrowLeft,
  Menu,
  X,
  Award,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  ShieldX,
  Store,
  ShoppingBag,
  Tags,
  Landmark,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

interface MenuItem {
  id: string
  label: string
  icon: string
  href: string
  badge?: string
  adminOnly?: boolean
  permission?: string
}

interface MenuCategory {
  id: string
  label: string
  icon: string
  items: MenuItem[]
  defaultExpanded?: boolean
}

// Componentes de ícones usando Lucide React (redução leve para caber mais itens)
const DashboardIcon = () => <LayoutDashboard className="w-4 h-4" />
const NetworkIcon = () => <Network className="w-4 h-4" />
const BusinessIcon = () => <Building2 className="w-4 h-4" />
const PlansIcon = () => <Package className="w-4 h-4" />
const EarningsIcon = () => <DollarSign className="w-4 h-4" />
const TransactionsIcon = () => <CreditCard className="w-4 h-4" />
const ProfileIcon = () => <UsersIcon className="w-4 h-4" />
const SettingsIcon = () => <Settings className="w-4 h-4" />
const TestIcon = () => <TestTube className="w-4 h-4" />
const AdminIcon = () => <Shield className="w-4 h-4" />
const ActivationIcon = () => <CircleDot className="w-4 h-4" />
const PackagesIcon = () => <Package className="w-4 h-4" />
const WithdrawalsIcon = () => <TrendingUp className="w-4 h-4" />
const BonusIcon = () => <Gift className="w-4 h-4" />
const FinancialIcon = () => <DollarSign className="w-4 h-4" />
const ReportsIcon = () => <BarChart3 className="w-4 h-4" />
const ParametersIcon = () => <Sliders className="w-4 h-4" />
const SimulatorIcon = () => <Calculator className="w-4 h-4" />
const LogsIcon = () => <FileCheck className="w-4 h-4" />
const BackIcon = () => <ArrowLeft className="w-4 h-4" />
const CareerIcon = () => <Award className="w-4 h-4" />
const RolesIcon = () => <Shield className="w-4 h-4" />
const SupportIcon = () => <MessageCircle className="w-4 h-4" />
const BlacklistIcon = () => <ShieldX className="w-4 h-4" />
const StoreIcon = () => <Store className="w-4 h-4" />
const ShoppingBagIcon = () => <ShoppingBag className="w-4 h-4" />
const TagsIcon = () => <Tags className="w-4 h-4" />
const PointsIcon = () => <BarChart3 className="w-4 h-4" />
const BankIcon = () => <Landmark className="w-4 h-4" />
const MinersIcon = () => <Building2 className="w-4 h-4" />
const DemoRecordingIcon = () => <Clapperboard className="w-4 h-4" />


const menuCategories: MenuCategory[] = [
  {
    id: 'main',
    label: 'Principal',
    icon: 'DashboardIcon',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'DashboardIcon',
        href: '/admin',
        permission: 'dashboard.admin'
      }
    ],
    defaultExpanded: true
  },
  {
    id: 'users',
    label: 'Usuários',
    icon: 'UsersIcon',
    items: [
      {
        id: 'users',
        label: 'Usuários',
        icon: 'UsersIcon',
        href: '/admin/usuarios',
        permission: 'users.read'
      },
      {
        id: 'career',
        label: 'Graduados',
        icon: 'CareerIcon',
        href: '/admin/graduados',
        permission: 'career.read'
      },
      {
        id: 'clube300',
        label: 'Clube dos 300',
        icon: 'CareerIcon',
        href: '/admin/clube-300',
        permission: 'users.read'
      },
      {
        id: 'pontos',
        label: 'Pontos',
        icon: 'PointsIcon',
        href: '/admin/pontos',
        permission: 'points.read'
      },
      {
        id: 'points-recalc-queue',
        label: 'Fila de Recalculo',
        icon: 'PointsIcon',
        href: '/admin/usuarios/fila-recalculo',
        permission: 'points.recalc.queue'
      }
    ],
    defaultExpanded: false
  },
  {
    id: 'financial',
    label: 'Financeiro',
    icon: 'FinancialIcon',
    items: [
      {
        id: 'transactions',
        label: 'Transações',
        icon: 'TransactionsIcon',
        href: '/admin/transacoes',
        permission: 'transactions.read'
      },
      {
        id: 'withdrawals',
        label: 'Saques',
        icon: 'WithdrawalsIcon',
        href: '/admin/saques',
        badge: '',
        permission: 'withdrawals.read'
      },
      {
        id: 'bonus',
        label: 'Monitoramento de Bônus',
        icon: 'BonusIcon',
        href: '/admin/bonus',
        permission: 'bonus.read'
      },
      {
        id: 'financial',
        label: 'Financeiro',
        icon: 'FinancialIcon',
        href: '/admin/financial',
        permission: 'financial.read'
      },
      {
        id: 'bank-bradesco',
        label: 'Banco',
        icon: 'BankIcon',
        href: '/admin/financeiro/banco',
        permission: 'bank.read'
      },
      {
        id: 'profit-schedule',
        label: 'Agendamento de Divisão de Lucro',
        icon: 'FinancialIcon',
        href: '/admin/divisao-lucro',
        permission: 'financial.read'
      }
    ],
    defaultExpanded: false
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: 'ReportsIcon',
    items: [
      {
        id: 'reports',
        label: 'Relatórios',
        icon: 'ReportsIcon',
        href: '/admin/relatorios',
        permission: 'reports.read'
      }
    ],
    defaultExpanded: false
  },
  {
    id: 'store',
    label: 'Loja Virtual',
    icon: 'StoreIcon',
    items: [
      {
        id: 'store-products',
        label: 'Produtos',
        icon: 'PackagesIcon',
        href: '/admin/loja/produtos',
        permission: 'packages.read'
      },
      {
        id: 'store-categories',
        label: 'Categorias',
        icon: 'TagsIcon',
        href: '/admin/loja/categorias',
        permission: 'packages.read'
      },
      {
        id: 'store-orders',
        label: 'Pedidos',
        icon: 'ShoppingBagIcon',
        href: '/admin/loja/pedidos',
        permission: 'transactions.read'
      }
    ],
    defaultExpanded: false
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: 'SettingsIcon',
    items: [
      {
        id: 'parameters',
        label: 'Parâmetros',
        icon: 'ParametersIcon',
        href: '/admin/parametros',
        permission: 'parameters.read'
      },
      {
        id: 'packages',
        label: 'Pacotes',
        icon: 'PackagesIcon',
        href: '/admin/pacotes',
        permission: 'packages.read'
      },
      {
        id: 'miners',
        label: 'Mineradoras',
        icon: 'MinersIcon',
        href: '/admin/mineradoras',
        permission: 'miners.read'
      },
      {
        id: 'promotions',
        label: 'Promoções',
        icon: 'PackagesIcon',
        href: '/admin/promocoes',
        permission: 'promotions.read'
      },
      {
        id: 'support',
        label: 'Suporte',
        icon: 'SupportIcon',
        href: '/admin/suporte',
        permission: 'support.read'
      },
      {
        id: 'settings',
        label: 'Configurações',
        icon: 'SettingsIcon',
        href: '/admin/configuracoes',
        permission: 'parameters.read'
      }
    ],
    defaultExpanded: false
  },
  {
    id: 'system',
    label: 'Sistema',
    icon: 'LogsIcon',
    items: [
      {
        id: 'logs',
        label: 'Logs do Sistema',
        icon: 'LogsIcon',
        href: '/admin/logs',
        permission: 'logs.read'
      },
      {
        id: 'logs-audit',
        label: 'Auditoria de Ações',
        icon: 'LogsIcon',
        href: '/admin/logs-auditoria',
        permission: 'logs.read'
      },
      {
        id: 'roles',
        label: 'Roles & Permissões',
        icon: 'RolesIcon',
        href: '/admin/roles-permissions',
        permission: 'roles.read'
      },
      {
        id: 'blacklist',
        label: 'Lista Negra',
        icon: 'BlacklistIcon',
        href: '/admin/blacklist',
        permission: 'blacklist.view'
      },
      {
        id: 'demo-recording',
        label: 'Gravação de Vídeos',
        icon: 'DemoRecordingIcon',
        href: '/admin/gravacao-videos',
        permission: 'demo.manage'
      }
    ],
    defaultExpanded: false
  },
  {
    id: 'navigation',
    label: 'Navegação',
    icon: 'BackIcon',
    items: [
      {
        id: 'back',
        label: 'Voltar ao Dashboard',
        icon: 'BackIcon',
        href: '/dashboard',
        permission: 'dashboard.user'
      }
    ],
    defaultExpanded: false
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
  FinancialIcon,
  CareerIcon,
  RolesIcon,
  SupportIcon,
  BlacklistIcon,
  StoreIcon,
  ShoppingBagIcon,
  TagsIcon,
  PointsIcon,
  BankIcon,
  MinersIcon,
  DemoRecordingIcon,
}

export default function AdminLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth()
  const { hasPermission, isSuperAdmin } = usePermissions()

  // Carregar estado do sidebar do localStorage ao inicializar
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen')
    if (savedSidebarState !== null) {
      setSidebarOpen(JSON.parse(savedSidebarState))
    }
  }, [])

  // Inicializar categorias expandidas baseado em defaultExpanded e rota ativa
  useEffect(() => {
    const initialExpanded = new Set<string>()
    
    menuCategories.forEach(category => {
      // Expandir se for defaultExpanded
      if (category.defaultExpanded) {
        initialExpanded.add(category.id)
      }
      
      // Expandir se algum item da categoria estiver ativo
      const hasActiveItem = category.items.some(item => {
        if (item.href === '/admin') {
          return pathname === '/admin'
        }
        if (item.href === '/dashboard') {
          return pathname === '/dashboard'
        }
        return pathname.startsWith(item.href) && item.href !== '#'
      })
      
      if (hasActiveItem) {
        initialExpanded.add(category.id)
      }
    })
    
    setExpandedCategories(initialExpanded)
  }, [pathname])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

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
    if (href === '/admin') {
      return pathname === '/admin'
    }
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href) && href !== '#'
  }

  // Filtrar categorias e itens baseado nas permissões do usuário
  const filteredCategories = menuCategories.map(category => ({
    ...category,
    items: category.items.filter(item => {
      // Filtrar "Agendamento de Divisão de Lucro" - apenas para SUPER_ADMIN
      if (item.id === 'profit-schedule' && !isSuperAdmin()) return false
      
      // Filtrar itens admin se não for admin
      if (item.adminOnly && !isAdmin) return false
      
      // Itens sem permissão específica sempre são mostrados
      if (!item.permission) return true
      
      // Verificar se o usuário tem a permissão necessária
      return hasPermission(item.permission)
    })
  })).filter(category => category.items.length > 0) // Remover categorias vazias

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
        <div className={`fixed left-0 z-50 bg-gradient-to-b from-gray-700 via-gray-600 to-gray-800 transition-all duration-300 shadow-xl ${isMobile
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
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Menu Items */}
          <nav className={`mt-4 px-2 overflow-y-auto pb-4 sidebar-scroll h-[calc(100vh-120px)]`}>
            <ul className="space-y-1">
              {filteredCategories.map((category) => {
                const CategoryIcon = iconComponents[category.icon as keyof typeof iconComponents]
                const isExpanded = expandedCategories.has(category.id)
                const hasActiveItem = category.items.some(item => isActive(item.href))

                return (
                  <li key={category.id} className="mb-2">
                    {/* Cabeçalho da Categoria */}
                    {category.items.length > 1 ? (
                      <>
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className={`w-full flex items-center px-2 py-2 rounded-md transition-all duration-200 group ${
                            hasActiveItem
                              ? 'bg-white/15 text-white'
                              : 'text-blue-100 hover:bg-white/10 hover:text-white'
                          } ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
                          tabIndex={0}
                          aria-label={`${category.label} - ${isExpanded ? 'Recolher' : 'Expandir'}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleCategory(category.id)
                            }
                          }}
                        >
                          <CategoryIcon />
                          {(sidebarOpen || isMobile) && (
                            <>
                              <span className="ml-2 flex-1 text-left font-medium text-sm">
                                {category.label}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </>
                          )}
                        </button>

                        {/* Itens da Categoria (quando expandida) */}
                        {isExpanded && (sidebarOpen || isMobile) && (
                          <ul className="mt-1 ml-2 space-y-0.5 border-l-2 border-blue-500/30 pl-2">
                            {category.items.map((item) => {
                              const IconComponent = iconComponents[item.icon as keyof typeof iconComponents]
                              const active = isActive(item.href)

                              return (
                                <li key={item.id}>
                                  <Link
                                    href={item.href}
                                    onClick={() => isMobile && setSidebarOpen(false)}
                                    className={`flex items-center px-2 py-1.5 rounded-md transition-all duration-200 group ${
                                      active
                                        ? 'bg-white/20 text-white shadow-lg'
                                        : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    <IconComponent />
                                    <span className="ml-2 flex-1 flex items-center justify-between text-sm">
                                      {item.label}
                                      {item.badge && (
                                        <span className="px-2 py-1 text-xs bg-yellow-500 text-yellow-900 rounded-full font-semibold">
                                          {item.badge}
                                        </span>
                                      )}
                                    </span>
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </>
                    ) : (
                      // Se só tem um item, mostrar como link direto (sem categoria)
                      category.items.map((item) => {
                        const IconComponent = iconComponents[item.icon as keyof typeof iconComponents]
                        const active = isActive(item.href)

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => isMobile && setSidebarOpen(false)}
                            className={`flex items-center px-2 py-1.5 rounded-md transition-all duration-200 group ${
                              active
                                ? 'bg-white/20 text-white shadow-lg'
                                : 'text-blue-100 hover:bg-white/10 hover:text-white'
                            } ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
                          >
                            <IconComponent />
                            {(sidebarOpen || isMobile) && (
                              <span className="ml-2 flex-1 flex items-center justify-between">
                                {item.label}
                                {item.badge && (
                                  <span className="px-2 py-1 text-xs bg-yellow-500 text-yellow-900 rounded-full font-semibold">
                                    {item.badge}
                                  </span>
                                )}
                              </span>
                            )}
                          </Link>
                        )
                      })
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
                  <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              </div>

              {/* User Menu */}
              <div className="relative flex items-center space-x-4 user-menu-container">
                {/* Carrinho 
              <CartIcon />*/}

                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
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