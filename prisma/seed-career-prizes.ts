import { prisma } from '../src/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

async function main() {
  console.log('🎁 Atualizando prêmios de carreira...')

  // Atualizar nível Cobre - 1º patamar
  await prisma.careerLevel.updateMany({
    where: { name: 'Cobre' },
    data: {
      careerBonusAmount: new Decimal(50.00),
      careerPrizeDescription: null, // Apenas bônus em dinheiro
      careerPrizeValue: new Decimal(0.00)
    }
  })
  console.log('✅ Nível Cobre atualizado com bônus de R$ 50')

  // Atualizar nível Prata - 2º patamar  
  await prisma.careerLevel.updateMany({
    where: { name: 'Prata' },
    data: {
      careerBonusAmount: new Decimal(200.00),
      careerPrizeDescription: null, // Apenas bônus em dinheiro
      careerPrizeValue: new Decimal(0.00)
    }
  })
  console.log('✅ Nível Prata atualizado com bônus de R$ 200')

  // Atualizar nível Ouro - 3º patamar
  await prisma.careerLevel.updateMany({
    where: { name: 'Ouro' },
    data: {
      careerBonusAmount: new Decimal(0.00), // Sem bônus em dinheiro
      careerPrizeDescription: '1 Notebook',
      careerPrizeValue: new Decimal(3000.00) // Valor será definido pelo admin
    }
  })
  console.log('✅ Nível Ouro atualizado com prêmio de 1 Notebook')

  console.log('🎉 Prêmios de carreira atualizados com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante atualização dos prêmios:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
