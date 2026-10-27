import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

/**
 * POST /api/admin/promotions/upload-image
 * Upload de imagem para Firebase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão para fazer upload de imagens' }, { status: 403 })
    }

    // Obter arquivo do FormData
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { error: 'Nenhuma imagem foi enviada' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'O arquivo deve ser uma imagem' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'A imagem deve ter no máximo 5MB' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = image.name.split('.').pop() || 'jpg'
    const fileName = `promotions/${timestamp}_${randomString}.${extension}`

    // Converter File para ArrayBuffer e depois para Buffer
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload para Firebase Storage
    const storageRef = ref(storage, fileName)
    await uploadBytes(storageRef, buffer)

    // Obter URL pública
    const downloadURL = await getDownloadURL(storageRef)

    return NextResponse.json({
      success: true,
      data: {
        url: downloadURL,
        fileName: fileName
      },
      message: 'Imagem enviada com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao fazer upload da imagem:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload da imagem', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

