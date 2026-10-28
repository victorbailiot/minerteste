import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'node:crypto'

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
    // Só formatos raster: SVG servido pelo nosso domínio poderia executar scripts
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(photo.type)) {
      return NextResponse.json(
        { error: 'A imagem deve ser JPG, PNG, WEBP ou GIF' },
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

    // Converter File para Buffer
    const arrayBuffer = await photo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Salvar a imagem no próprio Postgres. A URL leva um token aleatório para
    // que as fotos não possam ser listadas só incrementando o ID.
    const token = randomBytes(16).toString('hex')
    const photoUrl = await prisma.$transaction(async (tx) => {
      const created = await tx.userProfilePhoto.create({
        data: {
          userId: user.id,
          photoUrl: '',
          imageData: buffer,
          mimeType: photo.type,
        },
        select: { id: true },
      })

      const url = `/api/profile/photo/${created.id}/${token}`
      await tx.userProfilePhoto.update({
        where: { id: created.id },
        data: { photoUrl: url },
      })
      return url
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

