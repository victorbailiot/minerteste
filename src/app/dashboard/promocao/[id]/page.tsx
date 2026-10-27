'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PromocaoRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const promotionId = params?.id as string

  useEffect(() => {
    if (promotionId) {
      router.replace(`/dashboard/cupons?id=${promotionId}`)
    } else {
      router.replace('/dashboard/cupons')
    }
  }, [promotionId, router])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm text-gray-500 font-medium">Redirecionando para a Central de Cupons...</p>
    </div>
  )
}
