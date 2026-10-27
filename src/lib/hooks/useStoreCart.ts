import { useStoreCartContext } from '@/lib/context/StoreCartContext'

/**
 * Hook para acessar o carrinho da loja.
 * Deve ser usado dentro de StoreCartProvider (wrap no layout do dashboard).
 */
export function useStoreCart() {
  return useStoreCartContext()
}
