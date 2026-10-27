'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { X, Download, Share2 } from 'lucide-react'
import { Fjalla_One } from 'next/font/google'

const fjalla = Fjalla_One({ subsets: ['latin'], weight: '400', display: 'swap' })
import Image from 'next/image'

interface Graduation {
  id: string
  userId: string
  userName: string
  userEmail: string
  referralCode: string
  photoUrl?: string | null
  careerLevel: string
  requiredPoints: number
  totalNetworkPoints: number
  validPoints: number
  maxTeamVolumePercent: string
  indirectBonusLevels: number
  reactivationLevels: number
  extraProfitPercent: string
  travelBonus: string | null
  travelValue: string | null
  graduatedAt: string
}

interface CareerLevelData {
  id: string
  name: string
  requiredPoints: number
  maxTeamVolumePercent: number
  indirectBonusLevels: number
  reactivationLevels: number
  extraProfitPercent: number
  travelBonus: string | null
  travelValue: number | null
  pinImageUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  requiredDirects: number
  careerBonusAmount: number | null
  careerPrizeDescription: string | null
  careerPrizeValue: number | null
  flyer?: { id: string; textColor: string; backgroundImage: string } | null
}

interface FlyerModalProps {
  isOpen: boolean
  onClose: () => void
  graduation: Graduation | null
}

// Mapeamento de graduações para imagens e pins
const graduationAssets = {
  'QUARTZO': {
    backgroundImage: '/images/flyers/alderlan.jpeg', // Usando imagem padrão por enquanto
    pinImage: '/images/pins/cobre.png', // Usando pin padrão
    pinColor: 'from-gray-400 to-gray-600'
  },
  'COBRE': {
    backgroundImage: '/images/flyers/Cobre.png',
    pinImage: '/images/pins/cobre.png',
    pinColor: 'from-orange-400 to-orange-600'
  },
  'FERRO': {
    backgroundImage: '/images/flyers/alderlan.jpeg', // Usando imagem padrão por enquanto
    pinImage: '/images/pins/cobre.png', // Usando pin padrão
    pinColor: 'from-gray-500 to-gray-700'
  },
  'PRATA': {
    backgroundImage: '/images/flyers/PRATA.png',
    pinImage: '/images/pins/prata.png',
    pinColor: 'from-gray-300 to-gray-500'
  },
  'OURO': {
    backgroundImage: '/images/flyers/Ouro.png',
    pinImage: '/images/pins/ouro.png',
    pinColor: 'from-yellow-400 to-yellow-600'
  },
  'DIAMANTE': {
    backgroundImage: '/images/flyers/alderlan.jpeg', // Usando imagem padrão por enquanto
    pinImage: '/images/pins/diamante.png',
    pinColor: 'from-blue-300 to-blue-500'
  },
  'ESMERALDA': {
    backgroundImage: '/images/flyers/alderlan.jpeg', // Usando imagem padrão por enquanto
    pinImage: '/images/pins/esmeralda.png',
    pinColor: 'from-green-400 to-green-600'
  }
}

export default function FlyerModal({ isOpen, onClose, graduation }: FlyerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [careerLevelData, setCareerLevelData] = useState<CareerLevelData | null>(null)
  const [isLoadingCareerData, setIsLoadingCareerData] = useState(false)
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)
  const flyerRef = useRef<HTMLDivElement | null>(null)
  const nameContainerRef = useRef<HTMLDivElement | null>(null)
  const nameRef = useRef<HTMLHeadingElement | null>(null)
  const [nameFontSize, setNameFontSize] = useState<number>(40)
  const EXPORT_WIDTH = 700
  const EXPORT_HEIGHT = 875 // 4:5 (proporção mantida)

  const isExternalUrl = (url?: string | null) => !!url && /^https?:\/\//i.test(url)

  const toProxied = (url?: string | null) => {
    if (!url) return url ?? undefined
    return isExternalUrl(url) ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url
  }

  const waitForImagesToLoad = async (container: HTMLElement) => {
    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[]
    const pending = images
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => new Promise<void>((resolve) => {
        const done = () => resolve()
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
      }))
    if (pending.length > 0) {
      await Promise.race([
        Promise.all(pending),
        new Promise<void>(res => setTimeout(res, 5000)) // timeout de segurança
      ])
    }
  }

  const convertImagesToBase64 = async (container: HTMLElement) => {
    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[]
    for (const img of images) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const dataURL = canvas.toDataURL('image/jpeg', 0.95)
          img.src = dataURL
        }
      } catch (err) {
        console.warn('Não foi possível converter imagem:', err)
      }
    }
  }

  const forceInlineStyles = (root: HTMLElement) => {
    const all = Array.from(root.querySelectorAll('*')) as HTMLElement[]
    all.push(root)
    for (const el of all) {
      const cs = window.getComputedStyle(el)
      // Copiar apenas propriedades seguras, ignorando oklch/var()
      try {
        el.style.backgroundColor = cs.backgroundColor.includes('oklch') || cs.backgroundColor.includes('var(') ? 'transparent' : cs.backgroundColor
        el.style.color = cs.color.includes('oklch') || cs.color.includes('var(') ? '#ffffff' : cs.color
        el.style.backgroundImage = 'none'
        el.style.boxShadow = 'none'
        el.style.textShadow = 'none'
        el.style.filter = 'none'
        el.style.backdropFilter = 'none'
      } catch (e) {
        // Ignorar erros de estilos problemáticos
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Ajustar o tamanho da fonte do nome para caber em uma única linha
  useLayoutEffect(() => {
    const fitName = () => {
      if (!nameRef.current) return
      const containerWidth = (flyerRef.current?.clientWidth || nameContainerRef.current?.clientWidth || 0) - 16
      if (containerWidth <= 0) return
      const maxFont = 40
      const minFont = 12
      let font = maxFont
      nameRef.current.style.whiteSpace = 'nowrap'
      nameRef.current.style.fontSize = `${font}px`
      let guard = 0
      while (nameRef.current.scrollWidth > containerWidth && font > minFont && guard < 96) {
        font -= 1
        nameRef.current.style.fontSize = `${font}px`
        guard += 1
      }
      setNameFontSize(font)
    }

    const raf = requestAnimationFrame(() => {
      fitName()
      // Revalidar no próximo frame para garantir fontes aplicadas
      requestAnimationFrame(fitName)
    })
    // Reajustar quando as fontes terminarem de carregar
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      ;(document as any).fonts.ready.then(() => requestAnimationFrame(fitName)).catch(() => {})
    }
    const onResize = () => fitName()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [isOpen, graduation?.userName])

  // Buscar dados do career level quando o modal abrir
  useEffect(() => {
    const fetchCareerLevelData = async () => {
      if (!graduation) return

      // Resetar dados anteriores para não exibir flyer/pin do usuário anterior
      setCareerLevelData(null)
      setIsLoadingCareerData(true)
      try {
        const response = await fetch(`/api/career-levels/${encodeURIComponent(graduation.careerLevel)}`)
        if (response.ok) {
          const data = await response.json()
          setCareerLevelData(data)
        } else {
          console.error('Erro ao buscar dados do career level:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao buscar career level:', error)
      } finally {
        setIsLoadingCareerData(false)
      }
    }

    if (isOpen && graduation) {
      fetchCareerLevelData()
    }
    if (!isOpen) {
      // Limpar ao fechar
      setCareerLevelData(null)
      setIsLoadingCareerData(false)
    }
  }, [isOpen, graduation])


  if (!isOpen || !graduation) return null

  const assets = graduationAssets[graduation.careerLevel as keyof typeof graduationAssets] || graduationAssets['COBRE']
  // Evitar usar dados anteriores enquanto carrega
  const flyerBackground = !isLoadingCareerData && careerLevelData
    ? (careerLevelData.flyer?.backgroundImage || assets.backgroundImage)
    : undefined
  const flyerTextColor = !isLoadingCareerData && careerLevelData?.flyer?.textColor
    ? careerLevelData.flyer.textColor
    : '#FFFFFF'

  // Função para pegar primeiro e último nome
  const getFirstAndLastName = (fullName: string) => {
    const names = fullName.trim().split(' ')
    if (names.length === 1) return names[0]
    return `${names[0]} ${names[names.length - 1]}`
  }

  const handleDownload = async () => {
    if (!flyerRef.current) return
    setIsLoading(true)
    try {
      if (isLoadingCareerData) {
        alert('Aguarde carregar os dados do pin antes de baixar.')
        return
      }
      const domtoimage = (await import('dom-to-image-more')).default as any
      const sourceNode = flyerRef.current

      // Aguardar imagens carregarem no próprio nó exibido
      await waitForImagesToLoad(sourceNode)

      // Remover atributos de extensões que adicionam overlays/bordas
      const attrNames = ['bis_skin_checked', 'bis_register', '__processed', '__processed_by_automation']
      const nodesWithAttrs = Array.from(document.querySelectorAll('[bis_skin_checked], [bis_register], [__processed], [__processed_by_automation]'))
      const removedAttrs: Array<{ el: Element; name: string; value: string | null }> = []
      for (const el of nodesWithAttrs) {
        for (const attr of Array.from(el.attributes)) {
          if (attrNames.some(p => attr.name.startsWith(p))) {
            removedAttrs.push({ el, name: attr.name, value: attr.value })
            el.removeAttribute(attr.name)
          }
        }
      }

      // Injetar CSS para remover outlines/artefatos de borda durante a captura
      const cleanupStyle = document.createElement('style')
      cleanupStyle.setAttribute('data-export-cleanup', '1')
      cleanupStyle.innerHTML = `
        *{outline:none!important;-webkit-tap-highlight-color:transparent!important;box-shadow:none!important}
        *:not([data-keep-border]){border:none!important}
      `
      document.head.appendChild(cleanupStyle)

      // Capturar exatamente como está na tela (sem redimensionar/escala)
      const dataUrl = await domtoimage.toJpeg(sourceNode, {
        quality: 0.95,
        bgcolor: null,
        cacheBust: true,
        filter: () => true,
      })

      // Remover CSS temporário e restaurar atributos
      cleanupStyle.remove()
      for (const item of removedAttrs) {
        if (item.value !== null) item.el.setAttribute(item.name, item.value)
      }

      const safeName = (graduation.userName || 'flyer').replace(/[^a-zA-Z0-9-_]/g, '_')
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${safeName}_${graduation.careerLevel}_${ts}.jpeg`

      // Tentar salvar via compartilhamento nativo em dispositivos móveis
      try {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], filename, { type: 'image/jpeg' })
        const navAny = navigator as any
        if (navAny?.canShare && navAny.canShare({ files: [file] })) {
          await navAny.share({ files: [file], title: filename, text: `${graduation.userName} • ${graduation.careerLevel}` })
          return
        }
      } catch {
        // Ignorar e seguir com fallback de download
      }

      // Fallback: download padrão (desktop e navegadores sem Web Share com arquivos)
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Erro ao gerar imagem:', error)
      alert('Não foi possível gerar a imagem. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Parabéns ${graduation.userName}!`,
          text: `${graduation.userName} foi graduado como ${graduation.careerLevel} na MinerStone!`,
          url: window.location.href
        })
      } else {
        // Fallback para copiar para clipboard
        await navigator.clipboard.writeText(
          `Parabéns ${graduation.userName}! Graduado como ${graduation.careerLevel} na MinerStone!`
        )
        alert('Link copiado para a área de transferência!')
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full h-full overflow-hidden shadow-2xl">
        {/* Header - sobreposto e transparente */}
        <div
          className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 md:p-4 bg-transparent transition-transform duration-300 ${
            isToolbarVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <h2 className="text-sm md:text-lg font-semibold text-white truncate drop-shadow">
            <span className="hidden md:inline"></span>
          </h2>
          <div className="flex items-center gap-1 md:gap-2 bg-black/45 rounded-sm w-full justify-end p-1">
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-50 transition-colors"
            >
              <Download className="w-8 h-8 md:w-4 md:h-4 p-1" />
              <span className="hidden md:inline">Download</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-1 md:p-2 text-white rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            >
              <X className="w-8 h-8 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Flyer Content */}
        <div className="flex-1 overflow-auto p-0 sm:p-2 md:p-4">
          <div className="flex justify-center h-full">
            <div
              ref={flyerRef}
              className="relative w-full h-screen sm:max-w-[500px] sm:aspect-[3/4] sm:h-auto rounded-lg overflow-hidden shadow-lg"
              onClick={() => setIsToolbarVisible((prev) => !prev)}
            >
              {/* Background Image */}
              <div className="absolute inset-0 w-full h-full">
                {flyerBackground ? (
                  <Image
                    src={toProxied(flyerBackground) as string}
                    alt={`Background ${graduation.careerLevel}`}
                    fill
                    className="object-cover object-center w-full h-full"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-black/60" />
                )}
              </div>

              {/* Overlay Content */}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 md:p-8 text-center">
                

                {/* User Photo Container */}
                <div className="relative mb-20 md:mb-8">
                  {/* User Photo - Quadrada com bordas arredondadas */}
                  <div data-keep-border className="mt-16 w-80 h-80 md:w-80 md:h-80 lg:w-80  lg:h-80 rounded-2xl overflow-hidden border-4 border-white shadow-2xl relative">
                    {graduation.photoUrl ? (
                      <Image
                        src={toProxied(graduation.photoUrl) as string}
                        alt={graduation.userName}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                        unoptimized={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <span className="text-4xl md:text-5xl font-bold text-white">
                          {graduation.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pin/Badge - Posicionado sobre a foto */}
                  <div className="absolute -bottom-3 -right-9">
                    {isLoadingCareerData || !careerLevelData ? (
                      <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full bg-gray-300 animate-pulse flex items-center justify-center shadow-xl">
                        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : careerLevelData?.pinImageUrl ? (
                      <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl">
                        <Image
                          src={toProxied(careerLevelData.pinImageUrl) as string}
                          alt={`Pin ${graduation.careerLevel}`}
                          width={112}
                          height={112}
                          className="w-full h-full object-cover"
                          unoptimized={false}
                        />
                      </div>
                    ) : (
                      <div className={`w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br ${assets.pinColor} flex items-center justify-center shadow-xl`}>
                        <div className="text-center">
                          <div className="text-sm md:text-base font-bold text-white mb-1">
                            {graduation.careerLevel}
                          </div>
                          <div className="text-xs text-white font-medium">
                            MINERSTONE
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Name */}
                <div ref={nameContainerRef} className="mt-5">
                  <h2 ref={nameRef} className={`${fjalla.className} font-bold drop-shadow-lg max-w-full overflow-visible`} style={{ color: flyerTextColor, fontSize: `${nameFontSize}px`, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                    {getFirstAndLastName(graduation.userName).toUpperCase()}
                  </h2>
                </div>

                {/* Career Level */}
                <div className="mb-6 md:mb-8">
                  <p className={`${fjalla.className} text-1xl font-medium drop-shadow-md`} style={{ color: flyerTextColor }}>
                    NOVO {graduation.careerLevel.toUpperCase()} MINERSTONE
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
