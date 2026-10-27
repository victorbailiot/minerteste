'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Plus,
  Save,
  Loader2,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'

interface Category {
  id: string
  name: string
  slug: string
}

interface Promotion {
  id: string
  title: string
  startDate: string
  endDate: string
  isActive: boolean
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  comparePrice?: number
  sku?: string
  images: string[]
  categoryId: string
  type: 'PHYSICAL' | 'DIGITAL'
  generatesCoupon?: boolean
  promotionId?: string | null
  promotion?: { id: string; title: string } | null
  stock: number
  weight?: number
  height?: number
  width?: number
  length?: number
  originZipCode?: string
  isActive: boolean
  featured: boolean
  tags: string[]
  specifications?: Record<string, string>
}

export default function EditarProdutoPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const { user, isLoading: authLoading } = useAuth()
  const { hasRole, loading: permLoading } = usePermissions()
  
  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [uploadingImages, setUploadingImages] = useState(false)
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    sku: '',
    categoryId: '',
    type: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL',
    generatesCoupon: false,
    promotionId: '',
    stock: '',
    weight: '',
    height: '',
    width: '',
    length: '',
    originZipCode: '',
    isActive: true,
    featured: false,
    tags: [] as string[],
    specifications: {} as Record<string, string>
  })
  
  // Imagens existentes e novas
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagesPreviews, setNewImagesPreviews] = useState<string[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  
  const [tagInput, setTagInput] = useState('')
  const [specKey, setSpecKey] = useState('')
  const [specValue, setSpecValue] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchPromotions()
    fetchProduct()
  }, [productId])

  const fetchCategories = async () => {
    const parseCategories = (data: unknown) =>
      Array.isArray(data) ? data : (data as any)?.categories ?? (data as any)?.data ?? []

    try {
      let response = await fetch('/api/admin/store/categories', { credentials: 'include' })
      if (!response.ok) {
        response = await fetch('/api/store/categories')
      }
      if (response.ok) {
        const data = await response.json()
        setCategories(parseCategories(data))
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      setCategories([])
    }
  }

  const fetchPromotions = async () => {
    try {
      const response = await fetch('/api/admin/promotions', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data.data) ? data.data : []
        setPromotions(list)
      }
    } catch (error) {
      console.error('Erro ao buscar promoções:', error)
      setPromotions([])
    }
  }

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/admin/store/products/${productId}`)
      if (!response.ok) {
        throw new Error('Produto não encontrado')
      }
      
      const product: Product = await response.json()
      
      // Preencher formulário
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        comparePrice: product.comparePrice?.toString() || '',
        sku: product.sku || '',
        categoryId: product.categoryId,
        type: product.type,
        generatesCoupon: product.generatesCoupon ?? false,
        promotionId: product.promotionId?.toString() || '',
        stock: product.stock.toString(),
        weight: product.weight?.toString() || '',
        height: product.height?.toString() || '',
        width: product.width?.toString() || '',
        length: product.length?.toString() || '',
        originZipCode: product.originZipCode ? (product.originZipCode.length === 8 ? `${product.originZipCode.slice(0, 5)}-${product.originZipCode.slice(5)}` : product.originZipCode) : '',
        isActive: product.isActive,
        featured: product.featured,
        tags: product.tags || [],
        specifications: product.specifications || {}
      })
      
      setExistingImages(product.images)
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      toast.error('Erro ao carregar produto')
      router.push('/admin/loja/produtos')
    } finally {
      setLoadingProduct(false)
    }
  }

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const totalImages = existingImages.length - imagesToDelete.length + newImages.length + files.length
    if (totalImages > 10) {
      toast.error('Máximo de 10 imagens por produto')
      return
    }

    setNewImages(prev => [...prev, ...files])
    
    // Criar previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewImagesPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeExistingImage = (imageUrl: string) => {
    setImagesToDelete(prev => [...prev, imageUrl])
  }

  const restoreExistingImage = (imageUrl: string) => {
    setImagesToDelete(prev => prev.filter(url => url !== imageUrl))
  }

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index))
    setNewImagesPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadNewImagesToFirebase = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []
    
    for (const image of newImages) {
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const filename = `store/products/${timestamp}-${randomStr}-${image.name}`
      
      const storageRef = ref(storage, filename)
      await uploadBytes(storageRef, image)
      const url = await getDownloadURL(storageRef)
      uploadedUrls.push(url)
    }
    
    return uploadedUrls
  }

  const deleteImagesFromFirebase = async () => {
    for (const imageUrl of imagesToDelete) {
      try {
        // Extrair path do Firebase da URL
        const urlObj = new URL(imageUrl)
        const pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/)
        if (pathMatch) {
          const path = decodeURIComponent(pathMatch[1])
          const imageRef = ref(storage, path)
          await deleteObject(imageRef)
        }
      } catch (error) {
        console.error('Erro ao deletar imagem:', error)
        // Continuar mesmo se falhar
      }
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleAddSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [specKey.trim()]: specValue.trim()
        }
      }))
      setSpecKey('')
      setSpecValue('')
    }
  }

  const handleRemoveSpecification = (key: string) => {
    const { [key]: removed, ...rest } = formData.specifications
    setFormData(prev => ({
      ...prev,
      specifications: rest
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalImages = existingImages.filter(img => !imagesToDelete.includes(img))
    if (finalImages.length + newImages.length === 0) {
      toast.error('O produto deve ter pelo menos uma imagem')
      return
    }

    if (!formData.name || !formData.description || !formData.price || !formData.categoryId) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (formData.type === 'DIGITAL' && formData.generatesCoupon && !formData.promotionId) {
      toast.error('Selecione uma promoção para produtos que geram cupom')
      return
    }

    setLoading(true)

    try {
      // 1. Upload de novas imagens
      if (newImages.length > 0) {
        setUploadingImages(true)
        toast.info('Fazendo upload das novas imagens...')
      }
      const newImageUrls = await uploadNewImagesToFirebase()
      setUploadingImages(false)
      
      // 2. Deletar imagens marcadas
      if (imagesToDelete.length > 0) {
        toast.info('Removendo imagens antigas...')
        await deleteImagesFromFirebase()
      }
      
      // 3. Combinar imagens
      const allImages = [...finalImages, ...newImageUrls]
      
      // 4. Atualizar produto
      toast.info('Atualizando produto...')
      const response = await fetch(`/api/admin/store/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
          sku: formData.sku || undefined,
          images: allImages,
          categoryId: formData.categoryId,
          type: formData.type,
          stock: parseInt(formData.stock) || 0,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          width: formData.width ? parseFloat(formData.width) : undefined,
          length: formData.length ? parseFloat(formData.length) : undefined,
          originZipCode: formData.originZipCode?.replace(/\D/g, '').length === 8 ? formData.originZipCode.replace(/\D/g, '') : undefined,
          isActive: formData.isActive,
          featured: formData.featured,
          tags: formData.tags,
          specifications: formData.specifications,
          generatesCoupon: formData.type === 'DIGITAL' ? formData.generatesCoupon : false,
          promotionId: formData.type === 'DIGITAL' && formData.generatesCoupon && formData.promotionId ? formData.promotionId : null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar produto')
      }

      toast.success('Produto atualizado com sucesso!', {
        description: 'As alterações foram salvas.'
      })
      
      router.push('/admin/loja/produtos')
    } catch (error) {
      console.error('Erro ao atualizar produto:', error)
      toast.error('Erro ao atualizar produto', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      })
    } finally {
      setLoading(false)
      setUploadingImages(false)
    }
  }

  if (authLoading || permLoading || loadingProduct) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Verificar acesso admin: novo sistema (roles da tabela) ou campo role direto do User
  const isAdminByRole = hasRole('ADMIN') || hasRole('SUPER_ADMIN')
  const isAdminByField = user?.role === 'ADMIN'
  
  if (!isAdminByRole && !isAdminByField) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-xl">Acesso negado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/admin/loja/produtos"
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Produto</h1>
            <p className="text-gray-600">Atualize as informações do produto</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações Básicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Produto *
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição *
              </label>
              <textarea
                id="description"
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Preço *
              </label>
              <input
                type="number"
                id="price"
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="comparePrice" className="block text-sm font-medium text-gray-700 mb-2">
                Preço de Comparação
              </label>
              <input
                type="number"
                id="comparePrice"
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.comparePrice}
                onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                SKU
              </label>
              <input
                type="text"
                id="sku"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                id="categoryId"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Selecione uma categoria</option>
                {Array.isArray(categories) && categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Produto *
              </label>
              <select
                id="type"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as 'PHYSICAL' | 'DIGITAL'
                  setFormData({
                    ...formData,
                    type: newType,
                    generatesCoupon: newType === 'PHYSICAL' ? false : formData.generatesCoupon,
                    promotionId: newType === 'PHYSICAL' ? '' : formData.promotionId
                  })
                }}
              >
                <option value="PHYSICAL">Físico</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>

            {formData.type === 'DIGITAL' && (
              <>
                <div className="md:col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    id="generatesCoupon"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={formData.generatesCoupon}
                    onChange={(e) => setFormData({
                      ...formData,
                      generatesCoupon: e.target.checked,
                      promotionId: e.target.checked ? formData.promotionId : ''
                    })}
                  />
                  <label htmlFor="generatesCoupon" className="ml-2 text-sm font-medium text-gray-700">
                    Este produto gera cupom de sorteio
                  </label>
                </div>
                {formData.generatesCoupon && (
                  <div className="md:col-span-2">
                    <label htmlFor="promotionId" className="block text-sm font-medium text-gray-700 mb-2">
                      Promoção *
                    </label>
                    <select
                      id="promotionId"
                      required={formData.generatesCoupon}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={formData.promotionId}
                      onChange={(e) => setFormData({ ...formData, promotionId: e.target.value })}
                    >
                      <option value="">Selecione uma promoção</option>
                      {promotions.map((promo) => (
                        <option key={promo.id} value={promo.id}>
                          {promo.title} {!promo.isActive ? '(inativa)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Ao comprar este produto, o cliente receberá cupons de sorteio desta promoção.
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                Estoque *
              </label>
              <input
                type="number"
                id="stock"
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Imagens */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Imagens do Produto *</h2>
          
          {/* Imagens Existentes */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Imagens Atuais</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {existingImages.map((imageUrl, index) => {
                  const isMarkedForDeletion = imagesToDelete.includes(imageUrl)
                  return (
                    <div key={index} className="relative group">
                      <div className={`relative w-full h-32 rounded-lg overflow-hidden border-2 ${
                        isMarkedForDeletion ? 'border-red-500 opacity-50' : 'border-gray-200'
                      }`}>
                        <Image
                          src={imageUrl}
                          alt={`Imagem ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {isMarkedForDeletion && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                            <Trash2 className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      {isMarkedForDeletion ? (
                        <button
                          type="button"
                          onClick={() => restoreExistingImage(imageUrl)}
                          className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded opacity-100 group-hover:opacity-100 transition-opacity"
                        >
                          Restaurar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeExistingImage(imageUrl)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={loading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {index === 0 && !isMarkedForDeletion && (
                        <span className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          Principal
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upload de Novas Imagens */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Adicionar Novas Imagens</h3>
            <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-400 focus:outline-none">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="font-medium text-gray-600">
                  Clique para adicionar mais imagens
                </span>
                <span className="text-sm text-gray-500">
                  PNG, JPG, WEBP até 5MB
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleNewImageChange}
                disabled={loading}
              />
            </label>
          </div>

          {/* Preview de Novas Imagens */}
          {newImagesPreviews.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Novas Imagens (não salvas ainda)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {newImagesPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-green-500">
                      <Image
                        src={preview}
                        alt={`Nova imagem ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-1 bg-green-600 text-white text-xs rounded">
                      Nova
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dimensões (apenas produtos físicos) */}
        {formData.type === 'PHYSICAL' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dimensões e Peso</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  id="weight"
                  step="0.001"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-2">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-2">
                  Largura (cm)
                </label>
                <input
                  type="number"
                  id="width"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-2">
                  Comprimento (cm)
                </label>
                <input
                  type="number"
                  id="length"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="originZipCode" className="block text-sm font-medium text-gray-700 mb-2">
                  CEP de origem (para cálculo de frete)
                </label>
                <input
                  type="text"
                  id="originZipCode"
                  placeholder="00000-000"
                  maxLength={9}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={formData.originZipCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    const formatted = value.length > 5 ? `${value.slice(0, 5)}-${value.slice(5)}` : value
                    setFormData({ ...formData, originZipCode: formatted })
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">
                  CEP de onde o produto será enviado. Usado para calcular o frete no checkout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
          
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="text"
              placeholder="Digite uma tag"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Especificações */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Especificações Técnicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Nome da especificação (ex: Processador)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={specKey}
              onChange={(e) => setSpecKey(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Valor (ex: Intel Core i7)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddSpecification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {Object.keys(formData.specifications).length > 0 && (
            <div className="space-y-2">
              {Object.entries(formData.specifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">{key}:</span>
                    <span className="ml-2 text-gray-600">{value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(key)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                Produto ativo (visível na loja)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="featured"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              />
              <label htmlFor="featured" className="ml-2 text-sm font-medium text-gray-700">
                Produto em destaque
              </label>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/admin/loja/produtos"
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {uploadingImages ? 'Enviando imagens...' : 'Atualizando produto...'}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
