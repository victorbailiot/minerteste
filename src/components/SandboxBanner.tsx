'use client'

import { AlertTriangle } from 'lucide-react'
import { useSandboxMode } from '@/lib/hooks/useSandboxMode'

const SandboxBanner = () => {
  const isSandbox = useSandboxMode()

  if (!isSandbox) {
    return null
  }

  return (
    <div className="w-full bg-red-500 text-black px-4 py-1 shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        {/*<AlertTriangle className="w-4 h-4 flex-shrink-0" />
         <span>
          🧪 <strong>MODO SANDBOX</strong> - Este é um ambiente de teste. Todos os dados são fictícios e não representam transações reais.
        </span> */}
      </div>
    </div>
  )
}

export default SandboxBanner 