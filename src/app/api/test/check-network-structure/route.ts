import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Buscar todos os usuários
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        parentId: true,
        position: true,
        role: true,
        preferredSide: true
      },
      orderBy: { id: 'asc' }
    })

    // Organizar por estrutura hierárquica
    const buildTree = (parentId: bigint | null = null): any[] => {
      const children = allUsers.filter(u => {
        if (parentId === null) {
          return u.parentId === null
        }
        return u.parentId && Number(u.parentId) === Number(parentId)
      })

      return children.map(child => ({
        id: Number(child.id),
        name: child.name,
        email: child.email,
        position: child.position,
        role: child.role,
        preferredSide: child.preferredSide,
        children: buildTree(child.id)
      }))
    }

    const tree = buildTree()

    // Encontrar User 4
    const user4 = allUsers.find(u => 
      u.email === 'user4@email.com' || 
      u.name.toLowerCase().includes('user 4') ||
      u.name.toLowerCase().includes('user4')
    )

    // Análise da regra para User 4
    const admin = allUsers.find(u => u.role === 'ADMIN')
    let expectedPosition: { parentId: bigint, position: 'LEFT' | 'RIGHT' } | null = null

    if (admin && admin.preferredSide === 'RIGHT') {
      // Buscar recursivamente à direita
      const findLastRightPosition = (userId: bigint): { parentId: bigint, position: 'LEFT' | 'RIGHT' } => {
        const children = allUsers.filter(u => u.parentId && Number(u.parentId) === Number(userId))
        const rightChild = children.find(c => c.position === 'RIGHT')
        
        if (rightChild) {
          // Continuar busca no filho direito
          return findLastRightPosition(rightChild.id)
        } else {
          // Posição RIGHT vazia encontrada
          return { parentId: userId, position: 'RIGHT' }
        }
      }

      expectedPosition = findLastRightPosition(admin.id)
    }

    return NextResponse.json({
      success: true,
      allUsers: allUsers.map(u => ({
        id: Number(u.id),
        name: u.name,
        email: u.email,
        parentId: u.parentId ? Number(u.parentId) : null,
        position: u.position,
        role: u.role,
        preferredSide: u.preferredSide
      })),
      tree,
      user4Analysis: {
        found: !!user4,
        current: user4 ? {
          id: Number(user4.id),
          name: user4.name,
          email: user4.email,
          parentId: user4.parentId ? Number(user4.parentId) : null,
          position: user4.position
        } : null,
        expected: expectedPosition ? {
          parentId: Number(expectedPosition.parentId),
          position: expectedPosition.position
        } : null,
        isCorrect: user4 && expectedPosition ? 
          Number(user4.parentId || 0) === Number(expectedPosition.parentId) && 
          user4.position === expectedPosition.position : false
      },
      adminPreference: admin?.preferredSide || null
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
} 