// Forçar renderização dinâmica para evitar erro de build
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    
    const { preferredSide } = await request.json()
    
    if (!preferredSide || !['LEFT', 'RIGHT'].includes(preferredSide)) {
      return NextResponse.json({ error: 'Lado preferido inválido. Use LEFT ou RIGHT' }, { status: 400 })
    }

    // Atualizar a preferência do usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { preferredSide },
      select: {
        id: true,
        name: true,
        preferredSide: true
      }
    })

    // Buscar dados completos do usuário para atualizar a sessão
    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        referralCode: true,
        sponsorId: true,
        parentId: true,
        position: true,
        preferredSide: true,
        createdAt: true,
        packages: {
          include: {
            package: true
          }
        }
      }
    })

    if (!fullUser) {
      return NextResponse.json({ error: 'Usuário não encontrado após atualização' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Preferência de lado atualizada com sucesso',
      data: {
        updatedUser,
        fullUser: {
          id: fullUser.id.toString(),
          email: fullUser.email,
          name: fullUser.name,
          phone: fullUser.phone,
          role: fullUser.role,
          referralCode: fullUser.referralCode,
          sponsorId: fullUser.sponsorId?.toString(),
          parentId: fullUser.parentId?.toString(),
          position: fullUser.position,
          preferredSide: fullUser.preferredSide,
          createdAt: fullUser.createdAt.toISOString(),
          packages: fullUser.packages
        }
      }
    })

  } catch (error: any) {
    console.error('Erro ao atualizar preferência de lado:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    
    // Buscar a preferência atual do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        preferredSide: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: user
    })

  } catch (error: any) {
    console.error('Erro ao buscar preferência de lado:', error)
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
} 