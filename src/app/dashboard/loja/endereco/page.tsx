'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import { ArrowLeft, MapPin, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { AddressForm, type AddressData } from '@/components/international/AddressForm'
import { CountrySelector } from '@/components/international/CountrySelector'
import type { Country } from '@/lib/international-utils'

export default function AdicionarEnderecoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [country, setCountry] = useState<Country>({ code: 'BR', name: 'Brasil', flag: '🇧🇷', phoneCode: '+55' })
  const [isDefault, setIsDefault] = useState(false)
  const [address, setAddress] = useState<AddressData>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'BR'
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (user?.country) {
      const userCountry = { 
        code: user.country, 
        name: user.country === 'BR' ? 'Brasil' : user.country,
        flag: user.country === 'BR' ? '🇧🇷' : '🌍',
        phoneCode: user.country === 'BR' ? '+55' : '+1'
      }
      setCountry(userCountry)
      setAddress(prev => ({ ...prev, country: user.country || 'BR' }))
    }
  }, [user])

  const handleCountryChange = (selectedCountry: Country) => {
    setCountry(selectedCountry)
    setAddress(prev => ({ ...prev, country: selectedCountry.code }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address.street || !address.number || !address.neighborhood || !address.city || !address.state || !address.postalCode) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...address,
          country: country.code,
          isDefault
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar endereço')
      }

      const data = await response.json()
      
      toast.success('Endereço adicionado com sucesso!')
      
      // Se foi marcado como padrão ou se é o primeiro endereço, definir como padrão
      if (isDefault || data.address.isDefault) {
        // Aguardar um pouco para garantir que o endereço foi salvo
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Redirecionar para o checkout com parâmetro para recarregar endereços
      const returnTo = searchParams.get('returnTo') || '/dashboard/loja/checkout'
      router.push(`${returnTo}?addressAdded=true`)
    } catch (error) {
      console.error('Erro ao salvar endereço:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar endereço')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className=" mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/loja/checkout"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o checkout
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Adicionar endereço</h1>
          <p className="text-gray-600 mt-2">Preencha os dados do endereço de entrega</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* País */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <CountrySelector
              value={country.code}
              onChange={handleCountryChange}
              className="w-full"
            />
          </div>

          {/* Formulário de Endereço */}
          <AddressForm
            address={address}
            onChange={setAddress}
            country={country.code}
          />

          {/* Endereço Padrão */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="text-sm font-medium text-gray-700 cursor-pointer">
              Definir como endereço padrão
            </label>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <Link
              href="/dashboard/loja/checkout"
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar endereço
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
