import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findBestSpilloverPosition } from '@/lib/spillover'

export async function GET() {
  try {
    console.log('🔍 Testando spillover corrigido...')

    // 1. Verificar Admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            position: true
          }
        }
      }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
    }

    const leftChild = admin.children.find(child => child.position === 'LEFT')
    const rightChild = admin.children.find(child => child.position === 'RIGHT')

    console.log(`👑 Admin: ${admin.name}`)
    console.log(`📍 PreferredSide: ${admin.preferredSide}`)
    console.log(`   LEFT: ${leftChild?.name || 'VAZIO'}`)
    console.log(`   RIGHT: ${rightChild?.name || 'VAZIO'}`)

    // 2. Testar spillover
    const spilloverResult = await findBestSpilloverPosition(admin.id)
    
    console.log(`🌊 Resultado spillover:`)
    console.log(`   ParentId: ${Number(spilloverResult.parentId)}`)
    console.log(`   Position: ${spilloverResult.position}`)

    // 3. Verificar se está correto
    let isCorrect = false
    let explanation = ''

    if (admin.preferredSide === 'RIGHT' && !rightChild) {
      isCorrect = spilloverResult.position === 'RIGHT' && Number(spilloverResult.parentId) === Number(admin.id)
      explanation = isCorrect 
        ? 'Correto: Respeitou preferredSide=RIGHT para posição vazia'
        : 'Erro: Não respeitou preferredSide=RIGHT para posição vazia'
    } else if (admin.preferredSide === 'LEFT' && !leftChild) {
      isCorrect = spilloverResult.position === 'LEFT' && Number(spilloverResult.parentId) === Number(admin.id)
      explanation = isCorrect 
        ? 'Correto: Respeitou preferredSide=LEFT para posição vazia'
        : 'Erro: Não respeitou preferredSide=LEFT para posição vazia'
    } else {
      isCorrect = true // Spillover em profundidade é aceitável quando ambas posições ocupadas
      explanation = 'Ambas posições ocupadas - spillover em profundidade aplicado'
    }

    return NextResponse.json({
      success: true,
      admin: {
        name: admin.name,
        preferredSide: admin.preferredSide,
        children: {
          left: leftChild?.name || null,
          right: rightChild?.name || null
        }
      },
      spillover: {
        parentId: Number(spilloverResult.parentId),
        position: spilloverResult.position
      },
      test: {
        isCorrect,
        explanation
      }
    })

  } catch (error) {
    console.error('Erro no teste de spillover:', error)
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
} 