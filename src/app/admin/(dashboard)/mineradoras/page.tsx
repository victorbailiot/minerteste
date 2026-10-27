'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Miner, MinerUpsertInput } from '@/model/miners'
import { createMinerSchema } from '@/lib/validations/miners'

interface MinerApiResponse {
  success: boolean
  data: Miner[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const DEFAULT_FORM: MinerUpsertInput = {
  name: '',
  address: '',
  city: '',
  state: ''
}

export default function AdminMineradorasPage() {
  const [miners, setMiners] = useState<Miner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMiner, setEditingMiner] = useState<Miner | null>(null)
  const [formData, setFormData] = useState<MinerUpsertInput>(DEFAULT_FORM)

  const dialogTitle = useMemo(
    () => editingMiner ? `Editar Mineradora: ${editingMiner.name}` : 'Nova Mineradora',
    [editingMiner]
  )

  const loadMiners = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search
      })

      const response = await fetch(`/api/admin/miners?${params.toString()}`)
      const result = await response.json() as MinerApiResponse | { error?: string }

      if (!response.ok || !('success' in result) || !result.success) {
        throw new Error(('error' in result && result.error) || 'Erro ao carregar mineradoras')
      }

      setMiners(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalItems(result.pagination.total)
    } catch (error) {
      console.error('Erro ao carregar mineradoras:', error)
      toast.error('Erro ao carregar mineradoras')
    } finally {
      setLoading(false)
    }
  }, [limit, page, search])

  useEffect(() => {
    loadMiners()
  }, [loadMiners])

  const handleApplySearch = () => {
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleOpenCreate = () => {
    setEditingMiner(null)
    setFormData(DEFAULT_FORM)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (miner: Miner) => {
    setEditingMiner(miner)
    setFormData({
      name: miner.name,
      address: miner.address,
      city: miner.city,
      state: miner.state
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim().toUpperCase()
    }

    const validation = createMinerSchema.safeParse(payload)
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      setSaving(true)

      const isEdit = Boolean(editingMiner)
      const endpoint = isEdit ? `/api/admin/miners/${editingMiner?.id}` : '/api/admin/miners'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      })

      const result = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Não foi possível salvar a mineradora')
      }

      toast.success(isEdit ? 'Mineradora atualizada com sucesso' : 'Mineradora criada com sucesso')
      setIsDialogOpen(false)
      setEditingMiner(null)
      setFormData(DEFAULT_FORM)
      await loadMiners()
    } catch (error) {
      console.error('Erro ao salvar mineradora:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar mineradora')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (miner: Miner) => {
    const confirmed = window.confirm(`Deseja excluir a mineradora "${miner.name}"?`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/miners/${miner.id}`, {
        method: 'DELETE'
      })
      const result = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Não foi possível excluir a mineradora')
      }

      toast.success('Mineradora excluída com sucesso')
      await loadMiners()
    } catch (error) {
      console.error('Erro ao excluir mineradora:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir mineradora')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Carregando mineradoras...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mineradoras</h1>
          <p className="text-gray-600 mt-1">Gerencie as mineradoras disponíveis no sistema</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por nome da mineradora"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleApplySearch()
                }
              }}
            />
            <Button variant="outline" onClick={handleApplySearch}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {totalItems} mineradora{totalItems === 1 ? '' : 's'} encontrada{totalItems === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-2">Nome</th>
                  <th className="text-left py-3 pr-2">Endereço</th>
                  <th className="text-left py-3 pr-2">Cidade/UF</th>
                  <th className="text-left py-3 pr-2">Cadastro</th>
                  <th className="text-right py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {miners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Nenhuma mineradora encontrada
                    </td>
                  </tr>
                )}
                {miners.map((miner) => (
                  <tr key={miner.id} className="border-b last:border-0">
                    <td className="py-3 pr-2 font-medium">{miner.name}</td>
                    <td className="py-3 pr-2 text-gray-700">{miner.address}</td>
                    <td className="py-3 pr-2 text-gray-700">{miner.city}/{miner.state}</td>
                    <td className="py-3 pr-2 text-gray-500">
                      {new Date(miner.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(miner)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(miner)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="miner-name">Nome da mineradora *</Label>
              <Input
                id="miner-name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ex: Mina Central"
              />
            </div>

            <div>
              <Label htmlFor="miner-address">Endereço *</Label>
              <Input
                id="miner-address"
                value={formData.address}
                onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Rua, número e complemento"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="miner-city">Cidade *</Label>
                <Input
                  id="miner-city"
                  value={formData.city}
                  onChange={(event) => setFormData((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="Ex: Belo Horizonte"
                />
              </div>
              <div>
                <Label htmlFor="miner-state">Estado (UF) *</Label>
                <Input
                  id="miner-state"
                  maxLength={2}
                  value={formData.state}
                  onChange={(event) => setFormData((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
                  placeholder="Ex: MG"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
