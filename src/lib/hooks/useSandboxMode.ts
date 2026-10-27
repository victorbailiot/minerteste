'use client'

import { useState, useEffect } from 'react'

export const useSandboxMode = () => {
  const [isSandbox, setIsSandbox] = useState(false)

  useEffect(() => {
    // Verificar se estamos em um domínio diferente de minerstone.com.br
    const hostname = window.location.hostname
    const isProductionDomain = hostname === 'minerstone.com.br' || hostname === 'www.minerstone.com.br'
    setIsSandbox(!isProductionDomain)
  }, [])

  return isSandbox
} 