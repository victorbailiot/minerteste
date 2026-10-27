import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export interface UploadResult {
  url: string
  fileName: string
}

/**
 * Upload múltiplas imagens de suporte para Firebase Storage
 * @param ticketId ID do ticket de suporte
 * @param files Array de arquivos de imagem
 * @returns Array de URLs das imagens enviadas
 */
export async function uploadSupportImages(
  ticketId: string | number,
  files: File[]
): Promise<UploadResult[]> {
  if (!files || files.length === 0) {
    return []
  }

  // Validar número máximo de imagens
  if (files.length > 5) {
    throw new Error('Máximo de 5 imagens por ticket')
  }

  const uploadPromises = files.map(async (file) => {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      throw new Error(`Arquivo ${file.name} não é uma imagem válida`)
    }

    // Validar tamanho (máximo 5MB por imagem)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`Imagem ${file.name} deve ter no máximo 5MB`)
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `support-tickets/${ticketId}/${timestamp}_${randomString}.${extension}`

    try {
      // Converter File para ArrayBuffer e depois para Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload para Firebase Storage
      const storageRef = ref(storage, fileName)
      await uploadBytes(storageRef, buffer)

      // Obter URL pública
      const downloadURL = await getDownloadURL(storageRef)

      return {
        url: downloadURL,
        fileName: fileName
      }
    } catch (error) {
      console.error(`Erro ao fazer upload de ${file.name}:`, error)
      throw new Error(`Erro ao fazer upload de ${file.name}: ${error}`)
    }
  })

  try {
    const results = await Promise.all(uploadPromises)
    console.log(`✅ ${results.length} imagens enviadas com sucesso para ticket ${ticketId}`)
    return results
  } catch (error) {
    console.error('❌ Erro ao fazer upload das imagens:', error)
    throw error
  }
}

/**
 * Upload uma única imagem de suporte
 * @param ticketId ID do ticket de suporte
 * @param file Arquivo de imagem
 * @returns URL da imagem enviada
 */
export async function uploadSupportImage(
  ticketId: string | number,
  file: File
): Promise<UploadResult> {
  const results = await uploadSupportImages(ticketId, [file])
  return results[0]
}

/**
 * Gerar nome único para arquivo de suporte
 * @param originalName Nome original do arquivo
 * @param ticketId ID do ticket
 * @returns Nome único do arquivo
 */
export function generateSupportFileName(originalName: string, ticketId: string | number): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop() || 'jpg'
  return `support-tickets/${ticketId}/${timestamp}_${randomString}.${extension}`
}
