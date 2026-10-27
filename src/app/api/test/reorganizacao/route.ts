import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPackagePurchase } from '@/lib/business-logic'
import { getInitialNetworkStats } from '@/lib/initial-network'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  console.log('🧪 TESTANDO REORGANIZAÇÃO DA REDE DOS 10 PRIMEIROS CADASTROS')
  console.log('=' .repeat(60))

  try {
    console.log('🔍 Verificando reorganização...')
    
    // 1. Verificar User 3 - deveria ter assumido posição RIGHT
    const user3 = await prisma.user.findUnique({
      where: { id: BigInt(13) },
      include: {
        parent: { select: { name: true, role: true } },
        packages: {
          include: {
            package: { select: { name: true, price: true } }
          }
        }
      }
    })

    console.log(`User 3 encontrado:`)
    console.log(`  Nome: ${user3?.name}`)
    console.log(`  Pai: ${user3?.parent?.name} (${user3?.parent?.role})`)
    console.log(`  Posição: ${user3?.position}`)
    console.log(`  Pacotes: ${user3?.packages.map(p => `${p.package.name}($${p.package.price})`).join(', ')}`)

    // 2. Verificar User 1 - deveria ter sido rebaixado
    const user1 = await prisma.user.findUnique({
      where: { id: BigInt(18) },
      include: {
        parent: { select: { name: true } }
      }
    })

    console.log(`User 1:`)
    console.log(`  Nome: ${user1?.name}`)
    console.log(`  Pai: ${user1?.parent?.name}`)
    console.log(`  Posição: ${user1?.position}`)

    // 3. Testar lógica de negócio aplicada
    await processPackagePurchase(
      BigInt(13), // userId
      BigInt(2), // packageId FAMILY
      new Decimal(1000),
      BigInt(1) // sponsorId (admin)
    )

    return NextResponse.json({
      success: true,
      user3: {
        name: user3?.name,
        parent: user3?.parent?.name,
        position: user3?.position,
        hasRightPosition: user3?.position === 'RIGHT' && user3?.parent?.role === 'ADMIN'
      },
      user1: {
        name: user1?.name,
        parent: user1?.parent?.name,
        position: user1?.position,
        wasRebated: user1?.parent?.name === 'User 3'
      }
    })

  } catch (error) {
    console.error('Erro na verificação:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

async function mostrarEstadoRede() {
  const users = await prisma.user.findMany({
    where: { 
      role: 'USER'
    },
    include: {
      packages: {
        where: { isActive: true },
        include: { package: true }
      },
      parent: { select: { name: true } }
    },
    orderBy: { id: 'asc' }
  })

  console.log('\n🌳 ESTRUTURA DA REDE:')
  
  // Separar usuários do topo (sem pai) e com pai
  const topUsers = users.filter(u => !u.parentId && u.position)
  const childUsers = users.filter(u => u.parentId)
  const unpositionedUsers = users.filter(u => !u.parentId && !u.position)

  console.log('\n👑 TOPO DA REDE:')
  if (topUsers.length === 0) {
    console.log('   Nenhum usuário no topo')
  } else {
    topUsers.forEach(user => {
      const totalInvestment = user.packages.reduce((sum, up) => sum + Number(up.package.price), 0)
      console.log(`   ${user.position}: ID ${Number(user.id)} - ${user.name} - R$ ${totalInvestment}`)
    })
  }

  console.log('\n👥 USUÁRIOS POSICIONADOS:')
  if (childUsers.length === 0) {
    console.log('   Nenhum usuário posicionado')
  } else {
    childUsers.forEach(user => {
      const totalInvestment = user.packages.reduce((sum, up) => sum + Number(up.package.price), 0)
      console.log(`   ID ${Number(user.id)} - ${user.name} - R$ ${totalInvestment}`)
      console.log(`      ⤷ Sob: ${user.parent?.name || 'Unknown'} (${user.position})`)
    })
  }

  if (unpositionedUsers.length > 0) {
    console.log('\n❓ USUÁRIOS SEM POSIÇÃO:')
    unpositionedUsers.forEach(user => {
      const totalInvestment = user.packages.reduce((sum, up) => sum + Number(up.package.price), 0)
      console.log(`   ID ${Number(user.id)} - ${user.name} - R$ ${totalInvestment}`)
    })
  }

  return {
    topUsers: topUsers.map(user => ({
      id: Number(user.id),
      name: user.name,
      position: user.position,
      totalInvestment: user.packages.reduce((sum, up) => sum + Number(up.package.price), 0)
    })),
    childUsers: childUsers.map(user => ({
      id: Number(user.id),
      name: user.name,
      position: user.position,
      parentId: user.parentId ? Number(user.parentId) : null,
      parentName: user.parent?.name,
      totalInvestment: user.packages.reduce((sum, up) => sum + Number(up.package.price), 0)
    })),
    unpositionedUsers: unpositionedUsers.map(user => ({
      id: Number(user.id),
      name: user.name,
      totalInvestment: user.packages.reduce((sum, up) => sum + Number(up.package.price), 0)
    }))
  }
} 