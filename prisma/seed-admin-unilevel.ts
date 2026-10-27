import { PrismaClient } from '../src/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed para admin unilevel...')

  try {
    // Buscar o usuário admin
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    })

    if (!admin) {
      throw new Error('Usuário admin não encontrado. Execute primeiro o seed principal.')
    }

    console.log(`👤 Usuário admin encontrado: ${admin.name} (ID: ${admin.id})`)

    // Buscar o pacote unilevel existente com ID 1
    console.log('📦 Buscando pacote unilevel existente...')
    
    const unilevelPackage = await prisma.package.findFirst({
      where: { id: BigInt(1) }
    })
    
    if (!unilevelPackage) {
      throw new Error('Pacote unilevel com ID 1 não encontrado. Crie o pacote primeiro.')
    }

    console.log(`✅ Pacote unilevel encontrado: ${unilevelPackage.name} (ID: ${unilevelPackage.id})`)

    // Criar registro UnilevelUser para o admin se não existir
    console.log('👤 Criando registro UnilevelUser para admin...')
    
    const unilevelUser = await prisma.unilevelUser.upsert({
      where: { userId: admin.id },
      create: {
        userId: admin.id,
        totalPoints: 0,
        teamVolume: new Decimal(0),
        isActive: true
      },
      update: {}
    })

    console.log(`✅ UnilevelUser criado para admin (ID: ${unilevelUser.id})`)

    // Criar transação PURCHASE
    console.log('💰 Criando transação PURCHASE...')
    
    const transaction = await prisma.transaction.create({
      data: {
        userId: admin.id,
        type: 'PURCHASE',
        amount: unilevelPackage.price,
        description: `Compra do pacote ${unilevelPackage.name}`,
        status: 'COMPLETED',
        paidAt: new Date(),
        customerName: admin.name,
        customerEmail: admin.email,
        customerPhone: admin.phone || '',
        customerCpfCnpj: admin.cpf || ''
      }
    })

    console.log(`✅ Transação PURCHASE criada (ID: ${transaction.id})`)

    // Criar ou verificar UnilevelUserPackage com packageId 1
    console.log('📦 Criando/verificando userPackage...')
    
    let userPackage = await prisma.userPackage.findFirst({
      where: {
        userId: unilevelUser.id,
        packageId: BigInt(1)
      }
    })
    
    if (!userPackage) {
      userPackage = await prisma.userPackage.create({
        data: {
          userId: unilevelUser.id,
          packageId: BigInt(1),
          isActive: true,
          activatedAt: new Date(),
          transactionId: transaction.id
        }
      })
      console.log(`✅ UnilevelUserPackage criado (ID: ${userPackage.id})`)
    } else {
      console.log(`✅ UnilevelUserPackage já existe (ID: ${userPackage.id})`)
    }

    // Atualizar pontos do usuário
    console.log('📊 Atualizando pontos do usuário...')
    
    await prisma.unilevelUser.update({
      where: { id: unilevelUser.id },
      data: {
        totalPoints: unilevelPackage.points
      }
    })

    console.log('✅ Pontos atualizados com sucesso!')

    console.log('🎉 Seed concluído com sucesso!')
    console.log(`📋 Resumo:
    - Usuário Admin: ${admin.name} (ID: ${admin.id})
    - Pacote: ${unilevelPackage.name} (R$ ${unilevelPackage.price})
    - Transação: PURCHASE (ID: ${transaction.id})
    - UnilevelUserPackage: ID ${userPackage.id}
    - Pontos adicionados: ${unilevelPackage.points}`)

  } catch (error) {
    console.error('❌ Erro durante o seed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 