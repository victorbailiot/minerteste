import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 DEBUG DETALHADO: Estado atual da rede')

    // 1. Verificar Admin completo
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true
          }
        }
      }
    })

    console.log('👑 ADMIN COMPLETO:')
    console.log('   ID:', Number(admin?.id))
    console.log('   Name:', admin?.name)
    console.log('   PreferredSide:', admin?.preferredSide)
    console.log('   Filhos diretos:', admin?.children.length)

    const childrenDetails = admin?.children.map(child => ({
      id: Number(child.id),
      name: child.name,
      email: child.email,
      position: child.position
    })) || []

    console.log('   Detalhes dos filhos:')
    childrenDetails.forEach(child => {
      console.log(`     - ${child.name} (${child.email}) - Posição: ${child.position}`)
    })

    // 2. Verificar User2 especificamente
    const user2 = await prisma.user.findFirst({
      where: { email: 'user2@email.com' }
    })

    console.log('\n👤 USER2:')
    console.log('   ID:', user2 ? Number(user2.id) : 'NÃO ENCONTRADO')
    console.log('   Name:', user2?.name)
    console.log('   Position:', user2?.position)
    console.log('   ParentId:', user2?.parentId ? Number(user2.parentId) : 'null')
    console.log('   SponsorId:', user2?.sponsorId ? Number(user2.sponsorId) : 'null')

    // 3. Lógica de spillover simulada
    const leftChild = admin?.children.find(child => child.position === 'LEFT')
    const rightChild = admin?.children.find(child => child.position === 'RIGHT')

    console.log('\n🌳 ANÁLISE DE SPILLOVER:')
    console.log('   Admin preferredSide:', admin?.preferredSide)
    console.log('   LEFT ocupado por:', leftChild?.name || 'VAZIO')
    console.log('   RIGHT ocupado por:', rightChild?.name || 'VAZIO')

    let nextPosition: 'RIGHT' | 'LEFT' | 'SPILLOVER_REQUIRED' | null = null
    let reasoning = ''

    if (admin?.preferredSide === 'RIGHT' && !rightChild) {
      nextPosition = 'RIGHT'
      reasoning = 'PreferredSide=RIGHT e posição RIGHT está VAZIA'
    } else if (admin?.preferredSide === 'LEFT' && !leftChild) {
      nextPosition = 'LEFT'
      reasoning = 'PreferredSide=LEFT e posição LEFT está VAZIA'
    } else if (!leftChild) {
      nextPosition = 'LEFT'
      reasoning = 'Posição LEFT está VAZIA (fallback)'
    } else if (!rightChild) {
      nextPosition = 'RIGHT'
      reasoning = 'Posição RIGHT está VAZIA (fallback)'
    } else {
      nextPosition = 'SPILLOVER_REQUIRED'
      reasoning = 'Ambas posições ocupadas - spillover em profundidade necessário'
    }

    console.log('   Próxima posição deveria ser:', nextPosition)
    console.log('   Motivo:', reasoning)

    return NextResponse.json({
      success: true,
      admin: {
        id: Number(admin?.id),
        name: admin?.name,
        preferredSide: admin?.preferredSide,
        childrenCount: admin?.children.length || 0,
        children: childrenDetails
      },
      user2: user2 ? {
        id: Number(user2.id),
        name: user2.name,
        position: user2.position,
        parentId: user2.parentId ? Number(user2.parentId) : null,
        sponsorId: user2.sponsorId ? Number(user2.sponsorId) : null
      } : null,
      analysis: {
        leftOccupied: leftChild?.name || null,
        rightOccupied: rightChild?.name || null,
        nextPosition,
        reasoning,
        isCorrectSetup: admin?.preferredSide === 'RIGHT' && rightChild?.name === 'User 2'
      }
    })

  } catch (error) {
    console.error('Erro no debug:', error)
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
} 