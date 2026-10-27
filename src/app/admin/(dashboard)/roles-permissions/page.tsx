'use client'

import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Shield, Users, Key, FileText } from 'lucide-react'
import RolesTab from '@/components/roles-permissions/RolesTab'
import PermissionsTab from '@/components/roles-permissions/PermissionsTab'
import AuditTab from '@/components/roles-permissions/AuditTab'

type TabType = 'roles' | 'permissions' | 'audit'

export default function RolesPermissionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('roles')

  const tabs = [
    { id: 'roles' as TabType, label: 'Roles', icon: Shield },
    { id: 'permissions' as TabType, label: 'Permissões', icon: Key },
    { id: 'audit' as TabType, label: 'Auditoria', icon: FileText },
  ]

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Permissões</h1>
            <p className="mt-2 text-gray-600">
              Gerencie roles, permissões e controle de acesso do sistema
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
          {activeTab === 'audit' && <AuditTab />}
        </div>
      </div>
  )
}

