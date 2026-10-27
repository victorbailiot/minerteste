'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode
} from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { CartItem } from '@/model/store'

interface StoreCartContextValue {
  items: CartItem[]
  isLoaded: boolean
  isLoading: boolean
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => Promise<void>
  removeItem: (productId: string, variantId?: string) => Promise<void>
  updateQuantity: (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => Promise<void>
  clearCart: () => Promise<void>
  getTotalItems: () => number
  getTotalPrice: () => number
  getTotalWeight: () => number
  hasPhysicalProducts: () => boolean
  isInCart: (productId: string, variantId?: string) => boolean
  reloadCart: () => Promise<void>
}

const StoreCartContext = createContext<StoreCartContextValue | null>(null)

interface StoreCartProviderProps {
  children: ReactNode
}

export function StoreCartProvider({ children }: StoreCartProviderProps) {
  const { user, isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadCart = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setItems([])
      setIsLoaded(true)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/store/cart')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      } else {
        setItems([])
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error)
      setItems([])
    } finally {
      setIsLoading(false)
      setIsLoaded(true)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([])
      setIsLoaded(true)
    }
  }, [isAuthenticated])

  const addItem = useCallback(
    async (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado')
      }

      setIsLoading(true)
      try {
        const response = await fetch('/api/store/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            variantId: item.variantId,
            quantity
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao adicionar item ao carrinho')
        }

        await loadCart()
      } catch (error) {
        console.error('Erro ao adicionar item:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, loadCart]
  )

  const removeItem = useCallback(
    async (productId: string, variantId?: string) => {
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado')
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({ productId })
        if (variantId) params.append('variantId', variantId)

        const response = await fetch(`/api/store/cart?${params.toString()}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao remover item do carrinho')
        }

        await loadCart()
      } catch (error) {
        console.error('Erro ao remover item:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, loadCart]
  )

  const updateQuantity = useCallback(
    async (
      productId: string,
      variantId: string | undefined,
      quantity: number
    ) => {
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado')
      }

      if (quantity <= 0) {
        await removeItem(productId, variantId)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch('/api/store/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            variantId,
            quantity
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao atualizar quantidade')
        }

        await loadCart()
      } catch (error) {
        console.error('Erro ao atualizar quantidade:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, loadCart, removeItem]
  )

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Usuário não autenticado')
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/store/cart?clearAll=true', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao limpar carrinho')
      }

      await loadCart()
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, loadCart])

  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }, [items])

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }, [items])

  const getTotalWeight = useCallback(() => {
    return items
      .filter((i) => i.type === 'PHYSICAL' && i.weight)
      .reduce((total, item) => total + (item.weight || 0) * item.quantity, 0)
  }, [items])

  const hasPhysicalProducts = useCallback(() => {
    return items.some((i) => i.type === 'PHYSICAL')
  }, [items])

  const isInCart = useCallback(
    (productId: string, variantId?: string) => {
      return items.some(
        (i) => i.productId === productId && i.variantId === variantId
      )
    },
    [items]
  )

  const value: StoreCartContextValue = {
    items,
    isLoaded,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    getTotalWeight,
    hasPhysicalProducts,
    isInCart,
    reloadCart: loadCart
  }

  return (
    <StoreCartContext.Provider value={value}>
      {children}
    </StoreCartContext.Provider>
  )
}

export function useStoreCartContext() {
  const context = useContext(StoreCartContext)
  if (!context) {
    throw new Error(
      'useStoreCartContext deve ser usado dentro de StoreCartProvider'
    )
  }
  return context
}
