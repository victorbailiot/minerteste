'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  ShieldCheck
} from 'lucide-react'
import { PermissionGate } from '@/components/PermissionGate'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalPackages: number
  pendingWithdrawals: number
  totalRevenue: number
  monthlyGrowth: number
  cyclesCompleted: number
  pendingApprovals: number
}

interface RecentActivity {
  id: string
  type: 'user_registration' | 'package_purchase' | 'withdrawal_request' | 'cycle_completed'
  description: string
  timestamp: string
  status: 'success' | 'pending' | 'warning'
}

export default function AdminDashboard() {
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPackages: 0,
    pendingWithdrawals: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    cyclesCompleted: 0,
    pendingApprovals: 0
  })

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Só busca estatísticas se usuário tiver permissão do dashboard admin
    if (permissionsLoading) return
    if (!hasPermission('dashboard.admin')) {
      // Não carrega dados para quem não tem permissão
      setLoading(false)
      return
    }
    fetchAdminStats()
  }, [permissionsLoading, hasPermission])

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.data.stats)
        setRecentActivity(data.data.recentActivity)
      } else {
        console.error('Erro na resposta da API:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, change, color = 'blue' }: {
    title: string
    value: string | number
    icon: any
    change?: string
    color?: 'blue' | 'green' | 'red' | 'orange' | 'purple'
  }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      red: 'from-red-500 to-red-600',
      orange: 'from-orange-500 to-orange-600',
      purple: 'from-purple-500 to-purple-600'
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change && (
            <span className={`text-sm font-semibold ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-gray-600 text-sm mt-1">{title}</p>
      </div>
    )
  }

  const ActivityItem = ({ activity }: { activity: RecentActivity }) => {
    const statusColors = {
      success: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      warning: 'bg-red-100 text-red-800'
    }

    const statusIcons = {
      success: CheckCircle,
      pending: Clock,
      warning: AlertTriangle
    }

    const StatusIcon = statusIcons[activity.status]

    return (
      <div className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusColors[activity.status]}`}>
          <StatusIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">{activity.description}</p>
          <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGate
      permission="dashboard.admin"
      fallback={
        <div className="min-h-[50vh] bg-gray-50 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center max-w-xl">
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao Painel Administrativo</h1>
            <p className="text-gray-600 mt-3">
              Sua conta está ativa.
            </p>
          </div>
        </div>
      }
    >
    <div className="space-y-6">
      {loading ? (
        <div className="min-h-[30vh] bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando dashboard...</p>
          </div>
        </div>
      ) : (
      <>
      {/* Header com título e ações rápidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
            <p className="text-gray-600 mt-2">Visão geral do sistema e atividades recentes</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Monitorar Sistema
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Logs de Segurança
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Usuários"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          change={`+${stats.monthlyGrowth}%`}
          color="blue"
        />
        <StatCard
          title="Usuários Ativos"
          value={stats.activeUsers.toLocaleString()}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="Receita Total"
          value={`$${(stats.totalRevenue / 1000).toFixed(0)}k`}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Saques Pendentes"
          value={stats.pendingWithdrawals}
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      {/* Segunda linha de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pacotes Vendidos"
          value={stats.totalPackages.toLocaleString()}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Ciclos Completados"
          value={stats.cyclesCompleted.toLocaleString()}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Aprovações Pendentes"
          value={stats.pendingApprovals}
          icon={Clock}
          color="red"
        />
      </div>

      {/* Grid com atividades recentes e ações rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Atividades Recentes</h2>
              <p className="text-gray-600 text-sm mt-1">Últimas ações no sistema</p>
            </div>
            <div className="divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button className="text-gray-600 hover:text-gray-700 text-sm font-medium">
                Ver todas as atividades →
              </button>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <button className="w-full bg-gray-50 text-gray-700 border border-gray-200 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left">
                <div className="font-medium">Aprovar Saques</div>
                <div className="text-sm text-gray-600">{stats.pendingWithdrawals} pendentes</div>
              </button>
              <button className="w-full bg-blue-50 text-blue-700 border border-blue-200 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors text-left">
                <div className="font-medium">Gerenciar Usuários</div>
                <div className="text-sm text-blue-600">Ver detalhes da rede</div>
              </button>
              <button className="w-full bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors text-left">
                <div className="font-medium">Relatórios</div>
                <div className="text-sm text-green-600">Gerar relatório mensal</div>
              </button>
            </div>
          </div>

          {/* Alertas do Sistema */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">⚠️ Alertas do Sistema</h3>
            <div className="space-y-2 text-sm text-yellow-700">
              <p>• {stats.pendingApprovals} itens aguardando aprovação</p>
              <p>• {stats.pendingWithdrawals} solicitações de saque pendentes</p>
              <p>• Sistema funcionando normalmente</p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
    </PermissionGate>
  )
} 