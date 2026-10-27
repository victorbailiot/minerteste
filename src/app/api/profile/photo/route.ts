import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Obter arquivo do FormData
    const formData = await request.formData()
    const photo = formData.get('photo') as File

    if (!photo) {
      return NextResponse.json(
        { error: 'Nenhuma foto foi enviada' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'O arquivo deve ser uma imagem' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'A imagem deve ter no máximo 5MB' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = photo.name.split('.').pop() || 'jpg'
    const fileName = `profile-photos/${user.id}/${timestamp}_${randomString}.${extension}`

    // Converter File para ArrayBuffer e depois para Buffer
    const arrayBuffer = await photo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload para Firebase Storage
    const storageRef = ref(storage, fileName)
    await uploadBytes(storageRef, buffer, {
      contentType: photo.type,
    })

    // Obter URL de download
    const photoUrl = await getDownloadURL(storageRef)

    // Salvar URL no banco de dados
    await prisma.userProfilePhoto.create({
      data: {
        userId: user.id,
        photoUrl,
      },
    })

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Foto de perfil atualizada com sucesso',
    })
  } catch (error) {
    console.error('Erro ao fazer upload da foto de perfil:', error)
    return NextResponse.json(
      {
        error: 'Erro ao fazer upload da foto de perfil',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Buscar foto mais recente
    const latestPhoto = await prisma.userProfilePhoto.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        photoUrl: true,
        createdAt: true,
      },
    })

    if (!latestPhoto) {
      return NextResponse.json({
        success: true,
        photoUrl: null,
      })
    }

    return NextResponse.json({
      success: true,
      photoUrl: latestPhoto.photoUrl,
      uploadedAt: latestPhoto.createdAt,
    })
  } catch (error) {
    console.error('Erro ao buscar foto de perfil:', error)
    return NextResponse.json(
      {
        error: 'Erro ao buscar foto de perfil',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

