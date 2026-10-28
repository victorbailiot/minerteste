import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Serve a foto de perfil guardada no Postgres.
// Público porque a foto do patrocinador aparece na tela de cadastro (sem login);
// o token aleatório na URL impede listar as fotos pelo ID.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  const { id, token } = await params

  if (!/^\d+$/.test(id) || !/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  try {
    const photo = await prisma.userProfilePhoto.findUnique({
      where: { id: BigInt(id) },
      select: { photoUrl: true, imageData: true, mimeType: true },
    })

    if (!photo?.imageData || photo.photoUrl !== `/api/profile/photo/${id}/${token}`) {
      return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
    }

    return new NextResponse(Buffer.from(photo.imageData), {
      headers: {
        'Content-Type': photo.mimeType || 'image/jpeg',
        // Cada upload gera uma URL nova, então o conteúdo nunca muda
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Erro ao servir foto de perfil:', error)
    return NextResponse.json({ error: 'Erro ao buscar foto de perfil' }, { status: 500 })
  }
}
