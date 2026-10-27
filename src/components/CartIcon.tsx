'use client'

import { ShoppingCart } from 'lucide-react'
import { useStoreCart } from '@/lib/hooks/useStoreCart'
import Link from 'next/link'
import { useMemo } from 'react'

export default function CartIcon() {
  const { items, isLoaded } = useStoreCart()
  
  // Calcular total baseado no estado items para garantir re-render
  const totalItems = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }, [items])

  return (
    <Link 
      href="/dashboard/loja/carrinho" 
      className="relative inline-flex items-center justify-center p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
      title="Ver carrinho da loja"
    >
      <ShoppingCart className="w-6 h-6" />
      
      {isLoaded && totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </Link>
  )
} 