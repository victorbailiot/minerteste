import { PrismaClient } from '../src/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Iniciando seed dos novos pacotes de bonificação...')

  // Criar ou atualizar pacotes conforme novo plano
  console.log('📦 Criando/atualizando pacotes...')

  // Pacote Adcentro - R$ 80 (máx. 2 ciclos/dia, 60 no total)
  let adcentroPackage = await prisma.package.findFirst({
    where: { name: 'Núcleo' }
  })
  
  if (!adcentroPackage) {
    adcentroPackage = await prisma.package.create({
      data: {
        name: 'Núcleo',
        description: 'Perfeito para iniciantes visionários',
        price: new Decimal('550.00'), // Valor em USD
        points: 55,
        cycleBonus: new Decimal('60.00'), // Valor em BRL
        dailyCycles: 2,
        totalCycles: 60,
        profitSharePercent: new Decimal('2.5'),
        isActive: true,
        binaryBonusDailyLimit: 300,
        binaryBonusPercent: new Decimal('10.0')
      }
    })
  } else {
    adcentroPackage = await prisma.package.update({
      where: { id: adcentroPackage.id },
      data: {
        cycleBonus: new Decimal('60.00'),
        dailyCycles: 2,
        totalCycles: 60,
        profitSharePercent: new Decimal('2.5')
      }
    })
  }

  // Pacote Combo - R$ 120 (máx. 3/dia, 100 no total)
  let comboPackage = await prisma.package.findFirst({
    where: { name: 'Plasma' }
  })
  
  if (!comboPackage) {
    comboPackage = await prisma.package.create({
      data: {
        name: 'Plasma',
        description: 'Pacote intermediário com benefícios ampliados',
        price: new Decimal('1100.00'), // Valor em USD
        points: 110,
        cycleBonus: new Decimal('80.00'), // Valor em BRL
        dailyCycles: 3,
        totalCycles: 100,
        profitSharePercent: new Decimal('4.0'),
        isActive: true,
        binaryBonusDailyLimit: 500,
        binaryBonusPercent: new Decimal('12.0')
      }
    })
  } else {
    comboPackage = await prisma.package.update({
      where: { id: comboPackage.id },
      data: {
        cycleBonus: new Decimal('80.00'),
        dailyCycles: 3,
        totalCycles: 100,
        profitSharePercent: new Decimal('4.0')
      }
    })
  }

  // Pacote Family - R$ 160 (máx. 5/dia, 150 no total)
  let familyPackage = await prisma.package.findFirst({
    where: { name: 'Magma' }
  })
  
  if (!familyPackage) {
    familyPackage = await prisma.package.create({
      data: {
        name: 'Magma',
        description: 'Alta performance para construtores de equipe',
        price: new Decimal('2200.00'), // Valor em USD
        points: 220,
        cycleBonus: new Decimal('120.00'), // Valor em BRL
        dailyCycles: 5,
        totalCycles: 150,
        profitSharePercent: new Decimal('6.0'),
        isActive: true,
        binaryBonusDailyLimit: 1000,
        binaryBonusPercent: new Decimal('15.0')
      }
    })
  } else {
    familyPackage = await prisma.package.update({
      where: { id: familyPackage.id },
      data: {
        cycleBonus: new Decimal('120.00'),
        dailyCycles: 5,
        totalCycles: 150,
        profitSharePercent: new Decimal('6.0')
      }
    })
  }

  // Pacote TeamBuilder - R$ 240 (máx. 10/dia, 300 no total)
  let teamBuilderPackage = await prisma.package.findFirst({
    where: { name: 'Tecton' }
  })
  
  if (!teamBuilderPackage) {
    teamBuilderPackage = await prisma.package.create({
      data: {
        name: 'Tecton',
        description: 'Limites máximos. Ganhos máximos. Presença máxima',
        price: new Decimal('4400.00'), // Valor em USD
        points: 440,
        cycleBonus: new Decimal('140.00'), // Valor em BRL
        dailyCycles: 10,
        totalCycles: 300,
        profitSharePercent: new Decimal('10.0'),
        isActive: true,
        binaryBonusDailyLimit: 2500,
        binaryBonusPercent: new Decimal('18.0')
      }
    })
  } else {
    teamBuilderPackage = await prisma.package.update({
      where: { id: teamBuilderPackage.id },
      data: {
        cycleBonus: new Decimal('140.00'),
        dailyCycles: 10,
        totalCycles: 300,
        profitSharePercent: new Decimal('10.0')
      }
    })
  }

  console.log('✅ Pacotes criados/atualizados com sucesso!')
  console.log(`   • Núcleo: ${adcentroPackage.name} - ${adcentroPackage.dailyCycles} ciclos/dia, ${adcentroPackage.totalCycles} total`)
  console.log(`   • Plasma: ${comboPackage.name} - ${comboPackage.dailyCycles} ciclos/dia, ${comboPackage.totalCycles} total`)
  console.log(`   • Magma: ${familyPackage.name} - ${familyPackage.dailyCycles} ciclos/dia, ${familyPackage.totalCycles} total`)
  console.log(`   • Tecton: ${teamBuilderPackage.name} - ${teamBuilderPackage.dailyCycles} ciclos/dia, ${teamBuilderPackage.totalCycles} total`)

  console.log('🎉 Seed dos novos pacotes concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 