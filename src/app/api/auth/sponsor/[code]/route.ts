import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/sponsor/[code]
 * Busca informações públicas de um patrocinador pelo código de referência
 * Endpoint público (não requer autenticação)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Código inválido. O código deve ter 6 caracteres.' },
        { status: 400 }
      )
    }

    // Busca o usuário pelo código de referência
    const sponsor = await prisma.user.findUnique({
      where: {
        referralCode: code.toUpperCase()
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        referralCode: true
      }
    })

    if (!sponsor) {
      return NextResponse.json(
        { error: 'Patrocinador não encontrado.' },
        { status: 404 }
      )
    }

    if (!sponsor.isActive) {
      return NextResponse.json(
        { error: 'Este patrocinador não está ativo no momento.' },
        { status: 400 }
      )
    }

    // Buscar foto mais recente do patrocinador
    const latestPhoto = await prisma.userProfilePhoto.findFirst({
      where: { userId: sponsor.id },
      orderBy: { createdAt: 'desc' },
      select: {
        photoUrl: true
      }
    })

    // Retorna apenas dados públicos
    return NextResponse.json({
      success: true,
      sponsor: {
        id: sponsor.id.toString(),
        name: sponsor.name,
        profileImage: latestPhoto?.photoUrl || null,
        referralCode: sponsor.referralCode
      }
    })

  } catch (error) {
    console.error('Erro ao buscar patrocinador:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar informações do patrocinador.' },
      { status: 500 }
    )
  }
}

