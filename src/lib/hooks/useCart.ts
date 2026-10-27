import { useState, useEffect } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  points: number
  cycleBonus: number
  dailyCycles: number
  totalCycles: number
  profitSharePercent: number
  binaryBonusPercent: number
  binaryBonusDailyLimit: number
  quantity: number
}

interface UseCartReturn {
  items: CartItem[]
  isLoaded: boolean
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  isInCart: (itemId: string) => boolean
}

const CART_STORAGE_KEY = 'tectonminer_cart'

export const useCart = (): UseCartReturn => {
  console.log('🔄 useCart hook inicializado')
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Carregar carrinho do localStorage na inicialização
  useEffect(() => {
    // Verificar se estamos no lado do cliente
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      console.log('🔄 Carregando carrinho do localStorage:', savedCart)
      
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart)
          console.log('✅ Carrinho carregado:', parsedCart)
          setItems(parsedCart)
        } catch (error) {
          console.error('❌ Erro ao carregar carrinho:', error)
          localStorage.removeItem(CART_STORAGE_KEY)
        }
      } else {
        console.log('📭 Nenhum carrinho encontrado no localStorage')
      }
      setIsLoaded(true)
    }
  }, [])

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    // Verificar se estamos no lado do cliente e se já foi carregado
    if (typeof window !== 'undefined' && isLoaded) {
      console.log('💾 Salvando carrinho no localStorage:', items)
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } else {
      console.log('⏳ Aguardando carregamento do carrinho antes de salvar')
    }
  }, [items, isLoaded])

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    console.log('🛒 addItem chamado com:', item)
    
    setItems(prevItems => {
      console.log('📋 Itens anteriores:', prevItems)
      
      const existingItem = prevItems.find(i => i.id === item.id)
      console.log('🔍 Item existente:', existingItem)
      
      if (existingItem) {
        // Se o item já existe, incrementa a quantidade
        const newItems = prevItems.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
        console.log('➕ Item incrementado, novos itens:', newItems)
        return newItems
      } else {
        // Se não existe, adiciona com quantidade 1
        const newItems = [...prevItems, { ...item, quantity: 1 }]
        console.log('🆕 Item adicionado, novos itens:', newItems)
        return newItems
      }
    })
  }

  const removeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity }
          : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const isInCart = (itemId: string) => {
    return items.some(item => item.id === itemId)
  }

  return {
    items,
    isLoaded,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    isInCart
  }
} 