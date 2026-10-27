/**
 * Seed de configuração de pacotes — popula APENAS os novos campos de configuração.
 * NÃO altera directBonus, profitSharePercent, price, points nem outros campos financeiros.
 *
 * Adicione aqui os pacotes novos ao alterar o plano de bonificação.
 * Cada entrada usa `name` como chave de busca (case-insensitive).
 */

import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

interface PackageConfig {
  nameMatch: string
  slug: string
  clube300Eligible: boolean
  clube300Cotas: number
  clube300CashbackPercent: number
  maxInstallments: number
  generatesCouponOnPurchase: boolean
}

const packageConfigs: PackageConfig[] = [
  {
    nameMatch: 'átomo',
    slug: 'atomo',
    clube300Eligible: false,
    clube300Cotas: 1,
    clube300CashbackPercent: 0,
    maxInstallments: 12,
    generatesCouponOnPurchase: true,
  },
  {
    nameMatch: 'núcleo',
    slug: 'nucleo',
    clube300Eligible: true,
    clube300Cotas: 1,
    clube300CashbackPercent: 2.5,
    maxInstallments: 12,
    generatesCouponOnPurchase: false,
  },
  {
    nameMatch: 'tecton',
    slug: 'tecton',
    clube300Eligible: true,
    clube300Cotas: 2,
    clube300CashbackPercent: 6.0,
    maxInstallments: 12,
    generatesCouponOnPurchase: false,
  },
  {
    nameMatch: 'pluton',
    slug: 'pluton',
    clube300Eligible: false,
    clube300Cotas: 0,
    clube300CashbackPercent: 0,
    maxInstallments: 12,
    generatesCouponOnPurchase: false,
  }
]

async function main() {
  console.log('🌱 Seed de configuração de pacotes iniciado...')

  const allPackages = await prisma.package.findMany({
    where: { isUnilevel: true },
    select: { id: true, name: true, slug: true },
  })

  console.log(`📦 Pacotes unilevel encontrados: ${allPackages.length}`)

  for (const config of packageConfigs) {
    const pkg = allPackages.find(
      (p) => p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
        config.nameMatch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )

    if (!pkg) {
      console.log(`⚠️  Pacote "${config.nameMatch}" não encontrado — pulando`)
      continue
    }

    await prisma.package.update({
      where: { id: pkg.id },
      data: {
        slug: config.slug,
        clube300Eligible: config.clube300Eligible,
        clube300Cotas: config.clube300Cotas,
        clube300CashbackPercent: config.clube300CashbackPercent,
        maxInstallments: config.maxInstallments,
        generatesCouponOnPurchase: config.generatesCouponOnPurchase,
      },
    })

    console.log(
      `✅ Pacote "${pkg.name}" (ID ${Number(pkg.id)}) atualizado:` +
        ` slug="${config.slug}"` +
        ` | clube300Eligible=${config.clube300Eligible}` +
        ` | cotas=${config.clube300Cotas}` +
        ` | cashback=${config.clube300CashbackPercent}%` +
        ` | maxInstallments=${config.maxInstallments}` +
        ` | generatesCoupon=${config.generatesCouponOnPurchase}`
    )
  }

  console.log('\n✅ Seed de configuração de pacotes concluído.')
  console.log(
    'Para adicionar um novo pacote ao plano, adicione uma entrada em packageConfigs[] neste arquivo\n' +
    'e execute: npx ts-node prisma/seed-package-config.ts'
  )
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
