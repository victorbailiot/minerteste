/**
 * Seed do pacote Pluton (R$ 25.000) — modelo unilevel.
 * Executa apenas se o pacote ainda NÃO existir no banco.
 * Nunca altera pacotes já criados.
 *
 * Execute com:
 *   npx ts-node prisma/seed-pluton-package.ts
 */

import { PrismaClient } from '../src/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('🪨  Seed do pacote Pluton iniciado...')

  const existing = await prisma.package.findFirst({
    where: {
      OR: [
        { slug: 'pluton' },
        { name: 'Pluton', isUnilevel: true },
      ],
    },
  })

  if (existing) {
    console.log(
      `⚠️  Pacote Pluton já existe (ID ${Number(existing.id)}) — nenhuma alteração realizada.`
    )
    return
  }

  const pluton = await prisma.package.create({
    data: {
      name: 'Pluton',
      description: 'O pacote de maior potencial da Minerstone',
      price: new Decimal('25000.00'),
      points: 8000,
      isActive: true,
      isUnilevel: true,
      slug: 'pluton',

      // Bonificações unilevel
      directBonus: new Decimal('2000.00'),
      reactivationAmount: new Decimal('199.00'),
      reactivationBonus: new Decimal('9.00'),

      // Divisão de lucros
      profitSharePercent: new Decimal('12.00'),

      // Campos unilevel (sem ciclos binários)
      cycleBonus: new Decimal('0.00'),
      dailyCycles: 0,
      totalCycles: 0,
      binaryBonusPercent: new Decimal('0.00'),
      binaryBonusDailyLimit: new Decimal('0.00'),

      // Configurações gerais
      maxQuantity: 1,
      maxInstallments: 12,
      generatesCouponOnPurchase: false,

      // Clube 300 — não elegível
      clube300Eligible: false,
      clube300Cotas: 0,
      clube300CashbackPercent: new Decimal('0.00'),
    },
  })

  console.log(`✅ Pacote Pluton criado com sucesso!`)
  console.log(`   ID              : ${Number(pluton.id)}`)
  console.log(`   Nome            : ${pluton.name}`)
  console.log(`   Preço           : R$ ${pluton.price}`)
  console.log(`   Pontos          : ${pluton.points}`)
  console.log(`   Bônus direto    : R$ ${pluton.directBonus}`)
  console.log(`   Reativação      : R$ ${pluton.reactivationAmount}`)
  console.log(`   Bônus reativ.   : R$ ${pluton.reactivationBonus}`)
  console.log(`   % Lucros        : ${pluton.profitSharePercent}%`)
  console.log(`   Slug            : ${pluton.slug}`)
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
