import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Buscar todos os usuários relevantes
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { email: 'user1@email.com' },
          { email: 'user2@email.com' },
          { email: 'user3@email.com' }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        parentId: true,
        position: true,
        role: true
      },
      orderBy: { id: 'asc' }
    })

    // Organizar estrutura
    const admin = users.find(u => u.role === 'ADMIN')
    const user1 = users.find(u => u.email === 'user1@email.com')
    const user2 = users.find(u => u.email === 'user2@email.com')
    const user3 = users.find(u => u.email === 'user3@email.com')

    // Verificar filhos diretos do Admin
    const adminChildren = users.filter(u => 
      u.parentId && Number(u.parentId) === Number(admin?.id)
    )

    // Verificar filhos do User3
    const user3Children = users.filter(u => 
      u.parentId && Number(u.parentId) === Number(user3?.id)
    )

    const structure = {
      admin: {
        name: admin?.name,
        children: {
          left: adminChildren.find(c => c.position === 'LEFT')?.name || null,
          right: adminChildren.find(c => c.position === 'RIGHT')?.name || null
        }
      },
      user3: {
        name: user3?.name,
        parentId: user3?.parentId ? Number(user3.parentId) : null,
        position: user3?.position,
        children: {
          left: user3Children.find(c => c.position === 'LEFT')?.name || null,
          right: user3Children.find(c => c.position === 'RIGHT')?.name || null
        }
      },
      details: users.map(u => ({
        name: u.name,
        parentId: u.parentId ? Number(u.parentId) : null,
        position: u.position,
        isCorrect: u.email === 'user3@email.com' 
          ? u.parentId && Number(u.parentId) === Number(admin?.id) && u.position === 'RIGHT'
          : u.email === 'user1@email.com'
          ? u.parentId && Number(u.parentId) === Number(user3?.id)
          : true
      }))
    }

    // Verificar se reorganização está correta
    const isCorrect = 
      user3?.parentId && Number(user3.parentId) === Number(admin?.id) && user3.position === 'RIGHT' &&
      user1?.parentId && Number(user1.parentId) === Number(user3?.id)

    return NextResponse.json({
      success: true,
      structure,
      verification: {
        isCorrect,
        user3DirectUnderAdmin: user3?.parentId && Number(user3.parentId) === Number(admin?.id),
        user1UnderUser3: user1?.parentId && Number(user1.parentId) === Number(user3?.id),
        user3InRightPosition: user3?.position === 'RIGHT'
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
} 