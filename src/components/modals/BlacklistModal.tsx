'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Search, AlertCircle } from 'lucide-react'

interface BlacklistModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  entry?: any
  /** No modo edição: todas as entradas do mesmo usuário para preencher recursos já bloqueados */
  entriesForUser?: Array<{ resource: string; action: string | null }>
  mode: 'add' | 'edit'
}

interface User {
  id: string
  name: string
  email: string
}

interface Resource {
  key: string
  label: string
  actions: Array<{ key: string; label: string }>
}

interface BlacklistOption {
  resource: string
  action: string | null
  label: string
}

export default function BlacklistModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
  entriesForUser = [],
  mode
}: BlacklistModalProps) {
  const [formData, setFormData] = useState({
    userId: '',
    selectedResources: [] as Array<{ resource: string; action: string | null }>,
    reason: '',
    expiresAt: ''
  })
  
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [options, setOptions] = useState<BlacklistOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchResources()
      
      if (mode === 'edit' && entry) {
        const selectedResources =
          entriesForUser.length > 0
            ? entriesForUser.map((e) => ({ resource: e.resource || '', action: e.action ?? null }))
            : [{ resource: entry.resource || '', action: entry.action ?? null }]
        setFormData({
          userId: entry.userId || '',
          selectedResources,
          reason: entry.reason || '',
          expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString().slice(0, 16) : ''
        })
        
        if (entry.user) {
          setSelectedUser({
            id: entry.userId.toString(),
            name: entry.user.name,
            email: entry.user.email
          })
        }
      } else {
        resetForm()
      }
    }
  }, [isOpen, mode, entry, entriesForUser])

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/admin/blacklist/resources')
      const data = await response.json()
      
      if (data.success) {
        setResources(data.data.resources ?? [])
        setOptions(data.data.options ?? [])
      }
    } catch (error) {
      console.error('Erro ao buscar recursos:', error)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/admin/users/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) {
        searchUsers(userSearch)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearch])

  const resetForm = () => {
    setFormData({
      userId: '',
      selectedResources: [],
      reason: '',
      expiresAt: ''
    })
    setUserSearch('')
    setSearchResults([])
    setSelectedUser(null)
    setError('')
  }

  const isOptionSelected = (resource: string, action: string | null) =>
    formData.selectedResources.some(
      (r) => r.resource === resource && (r.action ?? null) === (action ?? null)
    )

  const toggleOption = (resource: string, action: string | null) => {
    setFormData((prev) => {
      const already = prev.selectedResources.some(
        (r) => r.resource === resource && (r.action ?? null) === (action ?? null)
      )
      if (already) {
        return {
          ...prev,
          selectedResources: prev.selectedResources.filter(
            (r) => !(r.resource === resource && (r.action ?? null) === (action ?? null))
          )
        }
      }
      return {
        ...prev,
        selectedResources: [...prev.selectedResources, { resource, action }]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedUser && mode === 'add') {
      setError('Selecione um usuário')
      return
    }

    if (formData.selectedResources.length === 0) {
      setError('Selecione ao menos um recurso')
      return
    }

    if (formData.reason.length < 10) {
      setError('O motivo deve ter no mínimo 10 caracteres')
      return
    }

    setLoading(true)

    try {
      const url = mode === 'add' 
        ? '/api/admin/blacklist' 
        : `/api/admin/blacklist/${entry.id}`
      
      const method = mode === 'add' ? 'POST' : 'PUT'

      const payload: any = {
        reason: formData.reason,
        expiresAt: formData.expiresAt || null
      }

      if (mode === 'add') {
        payload.userId = selectedUser?.id
        payload.resources = formData.selectedResources
      } else {
        payload.resources = formData.selectedResources
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
        resetForm()
      } else {
        setError(data.error || 'Erro ao salvar')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setError('Erro ao salvar entrada na blacklist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Adicionar à Blacklist' : 'Editar Entrada da Blacklist'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Busca de usuário (apenas no modo add) */}
          {mode === 'add' && (
            <div className="space-y-2">
              <Label htmlFor="userSearch">Usuário *</Label>
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null)
                      setUserSearch('')
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="userSearch"
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {searching && (
                    <p className="text-sm text-gray-500 mt-2">Buscando...</p>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user)
                            setSearchResults([])
                            setUserSearch('')
                          }}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Seleção de recursos (múltiplos) */}
          <div className="space-y-2">
            <Label>Recursos *</Label>
            <p className="text-xs text-gray-500 mb-2">
              Marque todos os recursos que o usuário não poderá acessar
            </p>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
              {options.map((opt) => {
                const checked = isOptionSelected(opt.resource, opt.action)
                return (
                  <label
                    key={`${opt.resource}:${opt.action ?? ''}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(opt.resource, opt.action)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  </label>
                )
              })}
            </div>
            {formData.selectedResources.length > 0 && (
              <p className="text-xs text-gray-600">
                {formData.selectedResources.length} recurso(s) selecionado(s)
              </p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Bloqueio *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Descreva o motivo do bloqueio (mínimo 10 caracteres)"
              rows={4}
              required
              minLength={10}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {formData.reason.length}/1000 caracteres
            </p>
          </div>

          {/* Data de expiração */}
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Data de Expiração (opcional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-gray-500">
              Deixe em branco para bloqueio permanente
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : mode === 'add' ? 'Adicionar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
