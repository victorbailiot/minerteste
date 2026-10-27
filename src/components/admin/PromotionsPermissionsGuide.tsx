'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Eye, 
  Plus, 
  Pencil, 
  Trash2, 
  Sparkles, 
  Ticket, 
  Shield, 
  Users, 
  Info, 
  X, 
  Key 
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PromotionsPermissionsGuideProps {
  isOpen: boolean
  onClose: () => void
}

export default function PromotionsPermissionsGuide({ isOpen, onClose }: PromotionsPermissionsGuideProps) {
  if (!isOpen) return null

  const permissions = [
    {
      key: 'promotions.read',
      name: 'Visualizar Promoções',
      description: 'Permite consultar o painel e listagem de promoções ativas e encerradas.',
      icon: Eye,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      key: 'promotions.create',
      name: 'Criar Promoções',
      description: 'Permite configurar novas campanhas promocionais e regras de pontuação.',
      icon: Plus,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      key: 'promotions.update',
      name: 'Editar Promoções',
      description: 'Permite alterar regulamentos, vigências e gatilhos de promoções existentes.',
      icon: Pencil,
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      key: 'promotions.delete',
      name: 'Excluir Promoções',
      description: 'Permite remover campanhas e cupons vinculados do banco de dados.',
      icon: Trash2,
      color: 'text-rose-600 bg-rose-50 border-rose-200'
    },
    {
      key: 'promotions.draw',
      name: 'Executar Sorteio',
      description: 'Permite acionar o algoritmo de apuração e sorteio dos números da sorte.',
      icon: Sparkles,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      key: 'promotions.coupons',
      name: 'Gerenciar Cupons',
      description: 'Permite auditar, listar e conceder cupons manualmente a usuários.',
      icon: Ticket,
      color: 'text-slate-700 bg-slate-100 border-slate-200'
    }
  ]

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in-50 duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header Corporativo */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Controle de Acesso & Permissões</h2>
              <p className="text-xs text-slate-300">
                Chaves de segurança necessárias para operadores do módulo de promoções
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Grid de Permissões */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Chaves de Acesso Disponíveis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissions.map((p) => {
                const IconComponent = p.icon
                return (
                  <div
                    key={p.key}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-colors flex items-start gap-3"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${p.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                        <code className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {p.key}
                        </code>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Instruções de Atribuição */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Como atribuir permissões a um operador
            </h3>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <li className="flex gap-2.5 items-start bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <div>
                  <span className="font-semibold text-slate-800">Acesse Usuários:</span> Vá para a tela de administração de usuários do sistema.
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <div>
                  <span className="font-semibold text-slate-800">Selecione o Operador:</span> Localize o cadastro desejado e acerte o perfil de acesso.
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <div>
                  <span className="font-semibold text-slate-800">Permissões Individuais:</span> Abra a aba de permissões e adicione as chaves necessárias.
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                <div>
                  <span className="font-semibold text-slate-800">Salvar Alterações:</span> As novas permissões passam a valer imediatamente.
                </div>
              </li>
            </ol>
          </div>

          {/* Perfis Automáticos */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">Acesso Master Automático</p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                Usuários com os papéis <strong>SUPER_ADMIN</strong> e <strong>ADMIN</strong> possuem acesso integral a todas as operações de promoção automaticamente, sem necessidade de configuração manual.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
          <Link href="/admin/usuarios">
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Gerenciar Usuários
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

