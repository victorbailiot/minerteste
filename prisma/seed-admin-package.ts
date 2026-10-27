import { PrismaClient } from '../src/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Iniciando seed para adicionar pacote ao administrador...')

  // Buscar o usuário administrador
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@miner.com' }
  })

  if (!admin) {
    console.error('❌ Usuário administrador não encontrado! Execute primeiro o seed principal.')
    return
  }

  console.log(`👤 Administrador encontrado: ${admin.name} (ID: ${admin.id})`)

  // Buscar o pacote Tecton (mais alto) para o administrador
  const tectonPackage = await prisma.package.findFirst({
    where: { name: 'Tecton' }
  })

  if (!tectonPackage) {
    console.error('❌ Pacote Tecton não encontrado! Execute primeiro o seed de pacotes.')
    return
  }

  console.log(`📦 Pacote encontrado: ${tectonPackage.name} (ID: ${tectonPackage.id})`)

  // Verificar se o administrador já possui este pacote
  const existingPackage = await prisma.userPackage.findFirst({
    where: {
      userId: admin.id,
      packageId: tectonPackage.id,
      isActive: true
    },
    select: {
      id: true,
      isActive: true,
      activatedAt: true
    }
  })

  if (existingPackage) {
    console.log('ℹ️ Administrador já possui o pacote Tecton ativo!')
    console.log('Verificando se há transações e pontos relacionados...')
  } else {
    // Calcular data de expiração (1 ano a partir de agora)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Criar o UserPackage para o administrador
    const userPackage = await prisma.userPackage.create({
      data: {
        userId: admin.id,
        packageId: tectonPackage.id,
        isActive: true,
        activatedAt: new Date(),
        expiresAt: expiresAt,
        completedCycles: 0
      },
      select: {
        id: true,
        userId: true,
        packageId: true,
        isActive: true,
        activatedAt: true,
        expiresAt: true,
        completedCycles: true
      }
    })

    console.log('✅ Pacote Tecton adicionado ao administrador com sucesso!')
    console.log(`   • ID do UserPackage: ${userPackage.id}`)
    console.log(`   • Ativado em: ${userPackage.activatedAt.toLocaleDateString('pt-BR')}`)
    console.log(`   • Expira em: ${userPackage.expiresAt?.toLocaleDateString('pt-BR')}`)
    console.log(`   • Ciclos completados: ${userPackage.completedCycles}`)
  }

  // Calcular data de expiração (1 ano a partir de agora)
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  // Criar o UserPackage para o administrador
  const userPackage = await prisma.userPackage.create({
    data: {
      userId: admin.id,
      packageId: tectonPackage.id,
      isActive: true,
      activatedAt: new Date(),
      expiresAt: expiresAt,
      completedCycles: 0
    },
    select: {
      id: true,
      userId: true,
      packageId: true,
      isActive: true,
      activatedAt: true,
      expiresAt: true,
      completedCycles: true
    }
  })

  console.log('✅ Pacote Tecton adicionado ao administrador com sucesso!')
  console.log(`   • ID do UserPackage: ${userPackage.id}`)
  console.log(`   • Ativado em: ${userPackage.activatedAt.toLocaleDateString('pt-BR')}`)
  console.log(`   • Expira em: ${userPackage.expiresAt?.toLocaleDateString('pt-BR')}`)
  console.log(`   • Ciclos completados: ${userPackage.completedCycles}`)

  // Criar uma transação para registrar a compra do pacote
  const transaction = await prisma.transaction.create({
    data: {
      userId: admin.id,
      type: 'DEPOSIT',
      amount: tectonPackage.price,
      status: 'COMPLETED',
      description: `Compra do pacote ${tectonPackage.name}`,
      referenceId: `PACKAGE_${userPackage.id}`
    }
  })

  // Verificar se já existe transação para este pacote
  const existingTransaction = await prisma.transaction.findFirst({
    where: {
      userId: admin.id,
      type: 'DEPOSIT',
      description: `Compra do pacote ${tectonPackage.name}`
    }
  })

  if (!existingTransaction) {
    // Criar uma transação para registrar a compra do pacote
    const transaction = await prisma.transaction.create({
      data: {
        userId: admin.id,
        type: 'DEPOSIT',
        amount: tectonPackage.price,
        status: 'COMPLETED',
        description: `Compra do pacote ${tectonPackage.name}`,
        referenceId: `PACKAGE_${existingPackage?.id || 'NEW'}`
      }
    })

    console.log('✅ Transação de compra registrada!')
    console.log(`   • ID da transação: ${transaction.id}`)
    console.log(`   • Valor: $${tectonPackage.price}`)
    console.log(`   • Status: ${transaction.status}`)
  } else {
    console.log('ℹ️ Transação de compra já existe!')
  }

  // Verificar se já existem pontos no histórico
  const existingPoints = await prisma.userPointsHistory.findFirst({
    where: {
      userId: admin.id,
      pointType: 'ACCRUAL',
      description: `Pontos do pacote ${tectonPackage.name}`
    }
  })

  if (!existingPoints) {
    // Adicionar pontos ao histórico do usuário
    const pointsHistory = await prisma.userPointsHistory.create({
      data: {
        userId: admin.id,
        sourceUserId: admin.id, // Auto-referência para pontos próprios
        side: 'LEFT', // Começar com LEFT
        points: tectonPackage.points,
        pointType: 'ACCRUAL',
        packageValue: tectonPackage.price,
        sourcePackageId: tectonPackage.id,
        description: `Pontos do pacote ${tectonPackage.name}`
      }
    })

    console.log('✅ Pontos adicionados ao histórico!')
    console.log(`   • ID do histórico: ${pointsHistory.id}`)
    console.log(`   • Pontos: ${pointsHistory.points}`)
    console.log(`   • Lado: ${pointsHistory.side}`)
  } else {
    console.log('ℹ️ Pontos já existem no histórico!')
  }

  console.log('\n🎉 Seed do pacote do administrador concluído com sucesso!')
  console.log('O administrador agora possui o pacote Tecton ativo e pode participar do sistema.')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 