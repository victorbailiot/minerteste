import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

/**
 * POST /api/financial/receipt
 * Upload de comprovante (PDF ou imagem) para transação financeira
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Obter arquivo do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const transactionId = formData.get('transactionId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo foi enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo (PDF ou imagens)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Apenas PDF, JPG, PNG e WEBP são aceitos.' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 10MB' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'jpg')
    const fileName = `financial-receipts/${session.user.id}/${transactionId || 'temp'}/${timestamp}_${randomString}.${extension}`

    // Converter File para ArrayBuffer e depois para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload para Firebase Storage
    const storageRef = ref(storage, fileName)
    await uploadBytes(storageRef, buffer)

    // Obter URL pública
    const downloadURL = await getDownloadURL(storageRef)

    return NextResponse.json({
      url: downloadURL,
      fileName: fileName,
      size: file.size,
      type: file.type,
      originalName: file.name
    })
  } catch (error) {
    console.error('Erro ao fazer upload do comprovante:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload do comprovante' },
      { status: 500 }
    )
  }
}