'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Clapperboard, ExternalLink, Loader2, Play, ShieldAlert, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { DEMO_MAIN_EMAIL, DEMO_VIDEOS } from '@/lib/demo-recording/videos'

interface DemoStatus {
  account: { id: string; name: string; email: string; referralCode: string; balance: number; directs: number } | null
  demoUsers: number
  miners: number
  promotions: number
  storeCoupons: number
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GravacaoVideosPage() {
  const { permissionKeys, loading: permissionsLoading } = usePermissions()
  const canManage = permissionKeys.includes('demo.manage')

  const [status, setStatus] = useState<DemoStatus | null>(null)
  const [disabledReason, setDisabledReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<number, string[]>>({})
  const [name, setName] = useState('Mariana Costa')
  const [password, setPassword] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/demo-recording')
      const data = await res.json()
      if (!res.ok) {
        setDisabledReason(data.error || 'Ferramenta indisponível')
        return
      }
      setDisabledReason(null)
      setStatus(data.data)
    } catch {
      setDisabledReason('Erro de conexão ao consultar a ferramenta')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (permissionsLoading) return
    if (!canManage) {
      setLoading(false)
      return
    }
    fetchStatus()
  }, [permissionsLoading, canManage, fetchStatus])

  const post = async (key: string, body: Record<string, unknown>) => {
    setBusy(key)
    try {
      const res = await fetch('/api/admin/demo-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro na operação')
        return null
      }
      await fetchStatus()
      return data.data
    } catch {
      toast.error('Erro de conexão')
      return null
    } finally {
      setBusy(null)
    }
  }

  const handleCreateAccount = async () => {
    const result = await post('account', { action: 'create-account', name, password })
    if (result) {
      toast.success('Conta de demonstração pronta')
      setPassword('')
    }
  }

  const handlePrepare = async (video: number) => {
    const result = await post(`video-${video}`, { action: 'prepare', video })
    if (result) {
      setLogs(prev => ({ ...prev, [video]: result.log }))
      toast.success(`Vídeo ${video} preparado`)
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Remover todos os usuários @demo, suas transações, rede, cupons e as mineradoras/campanhas criadas pela ferramenta?')) return
    const result = await post('cleanup', { action: 'cleanup' })
    if (result) {
      setLogs({})
      toast.success(
        `Removidos: ${result.users} usuários, ${result.transactions} transações, ${result.miners} mineradoras, ${result.promotions} campanhas e ${result.storeCoupons} cupons da loja`
      )
    }
  }

  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!canManage) {
    return <div className="p-6 text-gray-600">Você não tem permissão para acessar esta página (demo.manage).</div>
  }

  if (disabledReason) {
    return (
      <div className="max-w-2xl mx-auto mt-10 rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 flex gap-3">
        <ShieldAlert className="w-6 h-6 flex-shrink-0" />
        <div>
          <p className="font-semibold">Ferramenta de gravação indisponível</p>
          <p className="text-sm mt-1">{disabledReason}</p>
        </div>
      </div>
    )
  }

  const account = status?.account

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clapperboard className="w-6 h-6" />
            Gravação de Vídeos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Prepara a conta de demonstração no estado que cada vídeo tutorial exige. Disponível apenas fora da produção.
          </p>
        </div>
        <Button variant="destructive" onClick={handleCleanup} disabled={busy !== null}>
          {busy === 'cleanup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Limpar dados de demonstração
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conta de demonstração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {account ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Nome</p>
                <p className="font-medium">{account.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Login</p>
                <p className="font-medium break-all">{account.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Saldo</p>
                <p className="font-medium">{formatCurrency(account.balance)}</p>
              </div>
              <div>
                <p className="text-gray-500">Diretos</p>
                <p className="font-medium">{account.directs}</p>
              </div>
              <div>
                <p className="text-gray-500">Dados demo</p>
                <p className="font-medium">
                  {status.demoUsers} usuários · {status.miners} mineradoras · {status.promotions} campanhas
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Nenhuma conta criada. Ela usará o login <strong>{DEMO_MAIN_EMAIL}</strong>; a senha definida aqui também vale como senha financeira.
            </p>
          )}

          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <Label htmlFor="demo-name">Nome exibido</Label>
              <Input id="demo-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="demo-password">{account ? 'Nova senha (redefine login e financeira)' : 'Senha'}</Label>
              <Input
                id="demo-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateAccount} disabled={busy !== null || password.length < 6}>
              {busy === 'account' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {account ? 'Atualizar conta' : 'Criar conta demo'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Grave em uma janela anônima logada com a conta demo, para não misturar com a sessão de admin.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DEMO_VIDEOS.map(video => (
          <Card key={video.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Vídeo {video.id}: {video.title}
              </CardTitle>
              <p className="text-xs text-gray-500">
                <span className="font-semibold">Liberação:</span> {video.liberacao}
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-0.5">
                {video.steps.map(step => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">{video.prepareSummary}</p>

              {logs[video.id] && (
                <ul className="text-xs text-green-800 bg-green-50 border border-green-200 rounded p-2 space-y-0.5">
                  {logs[video.id].map(line => (
                    <li key={line}>✓ {line}</li>
                  ))}
                </ul>
              )}

              <div className="mt-auto flex gap-2 pt-2">
                <Button size="sm" onClick={() => handlePrepare(video.id)} disabled={!account || busy !== null}>
                  {busy === `video-${video.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Preparar
                </Button>
                <Link
                  href={video.startUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir {video.startUrl}
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
