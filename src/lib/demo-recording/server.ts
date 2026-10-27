/**
 * Preparação de estado para gravação dos vídeos tutoriais.
 *
 * Segurança:
 * - Só roda com DEMO_TOOLS_ENABLED="true" e fora dos domínios de produção.
 * - Só escreve em usuários cujo e-mail termina em DEMO_EMAIL_DOMAIN.
 * - Entidades globais criadas (mineradoras, campanhas, cupons da loja) ficam
 *   registradas no parâmetro DEMO_REGISTRY_KEY para a limpeza.
 */

import { NextRequest } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'
import { getUserBalance } from '@/lib/business-logic'
import { DEMO_EMAIL_DOMAIN, DEMO_MAIN_EMAIL } from './videos'

export const DEMO_TAG = 'DEMO-REC'
const DEMO_REGISTRY_KEY = 'demo_recording_registry'
const PRODUCTION_HOSTS = ['minerstone.com.br', 'www.minerstone.com.br']
const DAY = 24 * 60 * 60 * 1000

interface DemoRegistry {
  minerIds: string[]
  promotionIds: string[]
  storeCouponIds: string[]
}

export class DemoError extends Error {}

// ---------------------------------------------------------------------------
// Guarda de ambiente
// ---------------------------------------------------------------------------

function isProductionHost(host: string) {
  const h = host.split(':')[0].trim().toLowerCase()
  return PRODUCTION_HOSTS.includes(h) || h.endsWith('.minerstone.com.br')
}

/** Retorna o motivo do bloqueio, ou null se a ferramenta pode rodar */
export function getDemoGuardError(request: NextRequest): string | null {
  if (process.env.DEMO_TOOLS_ENABLED !== 'true') {
    return 'Ferramenta desativada neste ambiente. Defina DEMO_TOOLS_ENABLED="true" apenas em homologação ou desenvolvimento.'
  }
  const hosts = [
    request.headers.get('x-forwarded-host') || '',
    request.headers.get('host') || '',
    request.nextUrl.hostname,
  ]
  if (hosts.some(h => h && isProductionHost(h))) {
    return 'Ferramenta bloqueada no domínio de produção.'
  }
  const nextAuthUrl = process.env.NEXTAUTH_URL || ''
  if (nextAuthUrl && isProductionHost(new URL(nextAuthUrl).hostname)) {
    return 'Ferramenta bloqueada: NEXTAUTH_URL aponta para produção.'
  }
  return null
}

function assertDemoEmail(email: string) {
  if (!email.toLowerCase().endsWith(DEMO_EMAIL_DOMAIN)) {
    throw new DemoError(`Recusado: ${email} não é uma conta de demonstração.`)
  }
}

// ---------------------------------------------------------------------------
// Registro de entidades globais
// ---------------------------------------------------------------------------

async function readRegistry(): Promise<DemoRegistry> {
  const param = await prisma.parameter.findUnique({ where: { key: DEMO_REGISTRY_KEY } })
  const empty: DemoRegistry = { minerIds: [], promotionIds: [], storeCouponIds: [] }
  if (!param) return empty
  try {
    return { ...empty, ...JSON.parse(param.value) }
  } catch {
    return empty
  }
}

async function writeRegistry(registry: DemoRegistry) {
  const value = JSON.stringify(registry)
  await prisma.parameter.upsert({
    where: { key: DEMO_REGISTRY_KEY },
    create: {
      key: DEMO_REGISTRY_KEY,
      value,
      type: 'JSON',
      status: 'INATIVO',
      description: 'Registro interno da ferramenta de gravação de vídeos (dados de demonstração). Não editar.',
    },
    update: { value },
  })
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const daysAgo = (n: number) => new Date(Date.now() - n * DAY)
const money = (n: number) => new Prisma.Decimal(n.toFixed(2))

async function uniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (;;) {
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    if (!(await prisma.user.findUnique({ where: { referralCode: code } }))) return code
  }
}

async function uniqueLuckyNumber(): Promise<number> {
  for (;;) {
    const n = 900000 + Math.floor(Math.random() * 99999)
    if (!(await prisma.coupon.findUnique({ where: { luckyNumber: n } }))) return n
  }
}

async function uniqueVoucherCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  for (;;) {
    const code = `MINER-${part()}-${part()}`
    if (!(await prisma.paymentVoucher.findUnique({ where: { code } }))) return code
  }
}

async function getActivePackages() {
  return prisma.package.findMany({ where: { isActive: true, price: { gt: 0 } }, orderBy: { price: 'asc' } })
}

async function getDemoUser() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_MAIN_EMAIL } })
  if (!user) throw new DemoError('Crie a conta de demonstração primeiro.')
  assertDemoEmail(user.email)
  return user
}

async function getDemoUserIds(): Promise<bigint[]> {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_DOMAIN } },
    select: { id: true },
  })
  return users.map(u => u.id)
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export async function getDemoStatus() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_MAIN_EMAIL },
    select: { id: true, name: true, email: true, referralCode: true },
  })
  const [demoUsers, registry] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } }),
    readRegistry(),
  ])
  const balance = user ? Number(await getUserBalance(user.id)) : 0
  const directs = user ? await prisma.user.count({ where: { sponsorId: user.id } }) : 0
  return {
    account: user ? { ...user, id: user.id.toString(), balance, directs } : null,
    demoUsers,
    miners: registry.minerIds.length,
    promotions: registry.promotionIds.length,
    storeCoupons: registry.storeCouponIds.length,
  }
}

// ---------------------------------------------------------------------------
// Conta de demonstração
// ---------------------------------------------------------------------------

export async function createDemoAccount(name: string, password: string) {
  if (password.length < 6) throw new DemoError('A senha precisa ter ao menos 6 caracteres.')
  const passwordHash = await hash(password, 10)

  const existing = await prisma.user.findUnique({ where: { email: DEMO_MAIN_EMAIL } })
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name, password: passwordHash, financialPassword: passwordHash, isActive: true, emailVerified: true },
      })
    : await prisma.user.create({
        data: {
          email: DEMO_MAIN_EMAIL,
          name,
          phone: '11987654321',
          phoneCountryCode: '+55',
          phoneNumber: '11987654321',
          country: 'BR',
          password: passwordHash,
          financialPassword: passwordHash,
          referralCode: await uniqueReferralCode(),
          emailVerified: true,
          isActive: true,
          createdAt: daysAgo(120),
        },
      })

  await prisma.unilevelUser.upsert({
    where: { userId: user.id },
    create: { userId: user.id, isActive: true, ownPoints: 150, totalPoints: 150, createdAt: daysAgo(120) },
    update: { isActive: true },
  })

  // Uma cota ativa para a conta aparecer como ativa na rede e na carreira
  const hasPackage = await prisma.userPackage.findFirst({ where: { userId: user.id, isActive: true } })
  if (!hasPackage) {
    const packages = await getActivePackages()
    const pkg = packages[Math.min(1, packages.length - 1)]
    if (pkg) {
      const miner = await prisma.miner.findFirst({ orderBy: { id: 'asc' } })
      await prisma.userPackage.create({
        data: {
          userId: user.id,
          packageId: pkg.id,
          minerId: miner?.id ?? null,
          isActive: true,
          isUnilevel: pkg.isUnilevel,
          activatedAt: daysAgo(100),
          expiresAt: new Date(daysAgo(100).getTime() + 365 * DAY),
          priceSnapshot: pkg.price,
          directBonusSnapshot: pkg.directBonus,
          createdAt: daysAgo(100),
        },
      })
    }
  }

  return { id: user.id.toString(), email: user.email }
}

// ---------------------------------------------------------------------------
// Blocos reutilizados pelos vídeos
// ---------------------------------------------------------------------------

interface NetworkMemberSpec {
  key: string
  name: string
  parent: string | null // null = direto da conta demo
  packageIndex: number | null // índice em getActivePackages() (null = sem cota)
  status: 'ATIVO' | 'INATIVO' | 'VENCIDO'
  points: number
  joinedDaysAgo: number
  career?: boolean
}

const NETWORK: NetworkMemberSpec[] = [
  // Diretos (nível 1)
  { key: 'ana', name: 'Ana Beatriz Souza', parent: null, packageIndex: 2, status: 'ATIVO', points: 1450, joinedDaysAgo: 95, career: true },
  { key: 'bruno', name: 'Bruno Henrique Lima', parent: null, packageIndex: 1, status: 'ATIVO', points: 820, joinedDaysAgo: 88 },
  { key: 'carla', name: 'Carla Mendes Rocha', parent: null, packageIndex: 0, status: 'ATIVO', points: 310, joinedDaysAgo: 70 },
  { key: 'diego', name: 'Diego Martins Alves', parent: null, packageIndex: 1, status: 'VENCIDO', points: 150, joinedDaysAgo: 400 },
  { key: 'elaine', name: 'Elaine Cristina Prado', parent: null, packageIndex: null, status: 'INATIVO', points: 0, joinedDaysAgo: 30 },
  { key: 'fabio', name: 'Fábio Nogueira Dias', parent: null, packageIndex: 0, status: 'ATIVO', points: 120, joinedDaysAgo: 12 },
  // Indiretos (nível 2)
  { key: 'gabriela', name: 'Gabriela Torres Ramos', parent: 'ana', packageIndex: 1, status: 'ATIVO', points: 450, joinedDaysAgo: 80 },
  { key: 'henrique', name: 'Henrique Batista Melo', parent: 'ana', packageIndex: 0, status: 'ATIVO', points: 150, joinedDaysAgo: 60 },
  { key: 'isabela', name: 'Isabela Freitas Cunha', parent: 'ana', packageIndex: null, status: 'INATIVO', points: 0, joinedDaysAgo: 20 },
  { key: 'joao', name: 'João Pedro Cardoso', parent: 'bruno', packageIndex: 1, status: 'ATIVO', points: 300, joinedDaysAgo: 55 },
  { key: 'karina', name: 'Karina Lopes Vieira', parent: 'bruno', packageIndex: 0, status: 'VENCIDO', points: 80, joinedDaysAgo: 380 },
  { key: 'leonardo', name: 'Leonardo Araújo Pinto', parent: 'carla', packageIndex: 0, status: 'ATIVO', points: 100, joinedDaysAgo: 40 },
  // Nível 3
  { key: 'melissa', name: 'Melissa Ribeiro Castro', parent: 'gabriela', packageIndex: 0, status: 'ATIVO', points: 150, joinedDaysAgo: 35 },
  { key: 'nicolas', name: 'Nicolas Barros Teixeira', parent: 'gabriela', packageIndex: null, status: 'INATIVO', points: 0, joinedDaysAgo: 10 },
  { key: 'olivia', name: 'Olívia Moreira Santos', parent: 'joao', packageIndex: 0, status: 'ATIVO', points: 150, joinedDaysAgo: 25 },
]

/** Cria (uma vez) a rede fictícia abaixo da conta demo. Retorna os usuários por chave. */
async function ensureNetwork(demoUserId: bigint) {
  const packages = await getActivePackages()
  const miner = await prisma.miner.findFirst({ orderBy: { id: 'asc' } })
  const firstCareer = await prisma.careerLevel.findFirst({ where: { isActive: true }, orderBy: { requiredPoints: 'asc' } })
  const created = new Map<string, bigint>()
  const placeholderHash = await hash(`${DEMO_TAG}-${Date.now()}-${Math.random()}`, 10)

  for (const spec of NETWORK) {
    const email = `${spec.key}${DEMO_EMAIL_DOMAIN}`
    const sponsorId = spec.parent ? created.get(spec.parent)! : demoUserId
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: spec.name,
          phone: '11900000000',
          country: 'BR',
          password: placeholderHash,
          referralCode: await uniqueReferralCode(),
          sponsorId,
          emailVerified: true,
          isActive: true,
          createdAt: daysAgo(spec.joinedDaysAgo),
        },
      })
    }
    created.set(spec.key, user.id)

    await prisma.unilevelUser.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        sponsorId,
        isActive: spec.status === 'ATIVO',
        ownPoints: spec.points,
        totalPoints: spec.points,
        createdAt: daysAgo(spec.joinedDaysAgo),
      },
      update: { sponsorId, isActive: spec.status === 'ATIVO', ownPoints: spec.points, totalPoints: spec.points, pointsNeedsRecalc: false },
    })

    const pkg = spec.packageIndex === null ? null : packages[Math.min(spec.packageIndex, packages.length - 1)]
    if (pkg && !(await prisma.userPackage.findFirst({ where: { userId: user.id } }))) {
      const activatedAt = daysAgo(Math.max(spec.joinedDaysAgo - 2, 1))
      await prisma.userPackage.create({
        data: {
          userId: user.id,
          packageId: pkg.id,
          minerId: miner?.id ?? null,
          isActive: spec.status === 'ATIVO',
          isUnilevel: pkg.isUnilevel,
          activatedAt,
          expiresAt: new Date(activatedAt.getTime() + 365 * DAY),
          priceSnapshot: pkg.price,
          directBonusSnapshot: pkg.directBonus,
          createdAt: activatedAt,
        },
      })
    }

    if (spec.career && firstCareer && !(await prisma.unilevelUserCareer.findFirst({ where: { userId: user.id } }))) {
      await prisma.unilevelUserCareer.create({
        data: {
          userId: user.id,
          careerId: firstCareer.id,
          totalNetworkPoints: firstCareer.requiredPoints,
          validPoints: firstCareer.requiredPoints,
          maxTeamVolumePercent: firstCareer.maxTeamVolumePercent,
          graduatedAt: daysAgo(40),
        },
      })
      await prisma.unilevelUser.update({ where: { userId: user.id }, data: { careerLevelId: firstCareer.id } })
    }
  }

  // Pontos de rede de cada membro = próprios + descendentes
  const totals = new Map<string, number>()
  for (const spec of [...NETWORK].reverse()) {
    const children = NETWORK.filter(s => s.parent === spec.key)
    totals.set(spec.key, spec.points + children.reduce((sum, c) => sum + (totals.get(c.key) ?? 0), 0))
  }
  for (const spec of NETWORK) {
    const networkPoints = (totals.get(spec.key) ?? 0) - spec.points
    await prisma.unilevelUser.update({
      where: { userId: created.get(spec.key)! },
      data: { networkPoints, totalPoints: spec.points + networkPoints },
    })
  }

  return created
}

/** Lança o histórico de ganhos da conta demo (substitui o anterior) */
async function seedEarnings(demoUserId: bigint, network: Map<string, bigint>) {
  await prisma.transaction.deleteMany({
    where: { userId: demoUserId, correlationID: { startsWith: `${DEMO_TAG}-EARN` } },
  })

  const directBonus = (key: string, amount: number, days: number, packageName: string) => ({
    type: 'DIRECT_BONUS' as const,
    amount,
    days,
    description: `Bônus Direto - ${packageName}`,
    sourceUserId: network.get(key) ?? null,
    level: 1,
  })
  const indirectBonus = (key: string, amount: number, days: number, level: number, packageName: string) => ({
    type: 'INDIRECT_BONUS' as const,
    amount,
    days,
    description: `Bônus Indireto Nível ${level} - ${packageName}`,
    sourceUserId: network.get(key) ?? null,
    level,
  })
  const profitShare = (amount: number, days: number, month: string) => ({
    type: 'PROFIT_SHARE' as const,
    amount,
    days,
    description: `Divisão de Lucro - ${month}`,
    sourceUserId: null,
    level: null,
  })

  const entries = [
    directBonus('ana', 349.93, 93, 'Tecton'),
    directBonus('bruno', 69.93, 86, 'Núcleo'),
    profitShare(184.6, 62, 'Agosto/2026'),
    indirectBonus('gabriela', 49.95, 78, 2, 'Núcleo'),
    directBonus('carla', 6.93, 68, 'Átomo'),
    indirectBonus('joao', 49.95, 53, 2, 'Núcleo'),
    indirectBonus('henrique', 4.95, 58, 2, 'Átomo'),
    profitShare(212.4, 32, 'Setembro/2026'),
    indirectBonus('leonardo', 4.95, 38, 2, 'Átomo'),
    indirectBonus('melissa', 3.96, 33, 3, 'Átomo'),
    indirectBonus('olivia', 3.96, 23, 3, 'Átomo'),
    directBonus('fabio', 6.93, 10, 'Átomo'),
    profitShare(236.15, 2, 'Outubro/2026'),
  ]

  let i = 0
  for (const e of entries) {
    const at = daysAgo(e.days)
    await prisma.transaction.create({
      data: {
        userId: demoUserId,
        type: e.type,
        amount: money(e.amount),
        description: e.description,
        sourceUserId: e.sourceUserId,
        level: e.level,
        status: 'COMPLETED',
        correlationID: `${DEMO_TAG}-EARN-${i++}`,
        paidAt: at,
        createdAt: at,
      },
    })
  }

  // Um bônus ainda pendente (aparece como "pendente" no histórico)
  await prisma.transaction.create({
    data: {
      userId: demoUserId,
      type: 'INDIRECT_BONUS',
      amount: money(49.95),
      description: 'Bônus Indireto Nível 2 - Núcleo',
      sourceUserId: network.get('gabriela') ?? null,
      level: 2,
      status: 'PENDING',
      correlationID: `${DEMO_TAG}-EARN-${i++}`,
      createdAt: daysAgo(1),
    },
  })
}

async function ensurePixKey(user: { id: bigint; name: string }) {
  await prisma.pixKey.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      pixKeyType: 'EMAIL',
      pixKey: DEMO_MAIN_EMAIL,
      accountHolderName: user.name,
      bankName: 'Banco Inter',
    },
    update: { excludedAt: null, accountHolderName: user.name },
  })
}

async function ensureMiners(): Promise<string[]> {
  const registry = await readRegistry()
  const specs = [
    { name: 'Mina Serra Dourada', address: 'Rodovia PA-279, km 42', city: 'Canaã dos Carajás', state: 'PA' },
    { name: 'Mina Vale do Cobre', address: 'Estrada Municipal GO-336, km 18', city: 'Crixás', state: 'GO' },
    { name: 'Mina Morro Alto', address: 'Rodovia MG-129, km 7', city: 'Itabira', state: 'MG' },
  ]
  const existing = await prisma.miner.findMany({ where: { id: { in: registry.minerIds.map(BigInt) } } })
  const ids = existing.map(m => m.id)
  for (const spec of specs.slice(existing.length)) {
    const miner = await prisma.miner.create({ data: spec })
    ids.push(miner.id)
  }
  registry.minerIds = ids.map(String)
  await writeRegistry(registry)

  const packages = await getActivePackages()
  for (const minerId of ids) {
    for (const pkg of packages) {
      const link = await prisma.packageMiner.findFirst({ where: { minerId, packageId: pkg.id } })
      if (!link) await prisma.packageMiner.create({ data: { minerId, packageId: pkg.id } })
    }
  }
  return existing.length === specs.length ? [] : specs.slice(existing.length).map(s => s.name)
}

// ---------------------------------------------------------------------------
// Preparação por vídeo
// ---------------------------------------------------------------------------

export async function prepareVideo(videoId: number): Promise<string[]> {
  const user = await getDemoUser()
  const log: string[] = []

  switch (videoId) {
    case 2: {
      const network = await ensureNetwork(user.id)
      await seedEarnings(user.id, network)
      // Saques de ensaio (inclusive o do dia, que bloquearia um novo saque) e histórico
      await prisma.transaction.deleteMany({ where: { userId: user.id, type: 'WITHDRAWAL' } })
      await prisma.withdrawal.deleteMany({ where: { userId: user.id } })
      await prisma.transaction.createMany({
        data: [
          {
            userId: user.id,
            type: 'WITHDRAWAL',
            amount: money(300),
            taxa: money(4.99),
            description: 'Saque PIX',
            status: 'COMPLETED',
            correlationID: `${DEMO_TAG}-WD-1`,
            paidAt: daysAgo(44),
            createdAt: daysAgo(45),
          },
          {
            userId: user.id,
            type: 'WITHDRAWAL',
            amount: money(150),
            taxa: money(4.99),
            description: 'Saque PIX',
            status: 'PENDING',
            correlationID: `${DEMO_TAG}-WD-2`,
            createdAt: daysAgo(3),
          },
        ],
      })
      await ensurePixKey(user)
      const blacklist = await prisma.blacklistEntry.deleteMany({ where: { userId: user.id } })
      if (blacklist.count) log.push(`${blacklist.count} bloqueio(s) de blacklist removido(s).`)
      log.push('Rede, histórico de ganhos, saques e chave PIX prontos.')
      break
    }

    case 3: {
      const packages = await getActivePackages()
      if (packages.length === 0) throw new DemoError('Nenhum pacote ativo com preço. Ative um pacote em Admin › Pacotes.')
      const newMiners = await ensureMiners()
      if (newMiners.length) log.push(`Mineradoras criadas: ${newMiners.join(', ')}.`)
      log.push(`Vitrine: ${packages.map(p => `${p.name} (R$ ${Number(p.price).toLocaleString('pt-BR')})`).join(', ')}.`)
      if (Number(await getUserBalance(user.id)) <= 0) {
        await seedEarnings(user.id, await ensureNetwork(user.id))
        log.push('Saldo de bônus lançado para a forma de pagamento "Saldo de Bônus".')
      }
      const methods = ['Saldo de Bônus']
      if (process.env.STRIPE_SECRET_KEY) methods.push('Cartão (Stripe)')
      if (process.env.OPENPIX_APP_ID || process.env.STRIPE_SECRET_KEY) methods.push('PIX')
      log.push(`Formas de pagamento configuradas: ${methods.join(', ')}.`)
      break
    }

    case 4: {
      const newMiners = await ensureMiners()
      log.push(newMiners.length ? `Mineradoras criadas: ${newMiners.join(', ')}.` : 'Mineradoras de demonstração já existiam.')
      log.push('Todas vinculadas aos pacotes ativos.')
      break
    }

    case 5: {
      await prisma.bankAccount.deleteMany({ where: { userId: user.id } })
      await prisma.pixKey.deleteMany({ where: { userId: user.id } })
      log.push('Conta bancária e chave PIX removidas. A senha financeira é a mesma da conta demo.')
      break
    }

    case 6: {
      await ensureNetwork(user.id)
      log.push(`Rede criada: ${NETWORK.filter(n => !n.parent).length} diretos e ${NETWORK.filter(n => n.parent).length} indiretos.`)
      break
    }

    case 7: {
      const network = await ensureNetwork(user.id)
      const levels = await prisma.careerLevel.findMany({ where: { isActive: true }, orderBy: { requiredPoints: 'asc' } })
      if (levels.length < 2) throw new DemoError('São necessários ao menos dois níveis de carreira ativos.')
      const [current, next] = levels
      await prisma.unilevelUserCareer.deleteMany({ where: { userId: user.id } })
      await prisma.unilevelUserCareer.create({
        data: {
          userId: user.id,
          careerId: current.id,
          totalNetworkPoints: current.requiredPoints,
          validPoints: current.requiredPoints,
          maxTeamVolumePercent: current.maxTeamVolumePercent,
          graduatedAt: daysAgo(45),
        },
      })
      const networkPoints = Math.round(next.requiredPoints * 0.6)
      // Distribui a pontuação de forma desigual entre os diretos ativos (requisito de perna parcial)
      const directs = NETWORK.filter(n => !n.parent && n.status === 'ATIVO')
      const weights = [0.5, 0.25, 0.15, 0.1]
      for (const [i, d] of directs.entries()) {
        const pts = Math.round(networkPoints * (weights[i] ?? 0))
        await prisma.unilevelUser.update({ where: { userId: network.get(d.key)! }, data: { totalPoints: pts } })
      }
      await prisma.unilevelUser.update({
        where: { userId: user.id },
        data: { careerLevelId: current.id, networkPoints, totalPoints: networkPoints + 150, pointsNeedsRecalc: false, pointsLastUpdated: new Date() },
      })
      log.push(`Nível atual: ${current.name}. Próximo: ${next.name} (${networkPoints.toLocaleString('pt-BR')} de ${next.requiredPoints.toLocaleString('pt-BR')} pontos).`)
      break
    }

    case 8: {
      const registry = await readRegistry()
      await prisma.promotion.deleteMany({ where: { id: { in: registry.promotionIds.map(BigInt) } } })
      await prisma.storeDiscountCoupon.deleteMany({ where: { id: { in: registry.storeCouponIds.map(BigInt) } } })

      const packages = await getActivePackages()
      const active = await prisma.promotion.create({
        data: {
          title: 'Campanha Primavera Minerstone',
          description: 'A cada cota adquirida durante a campanha você recebe um cupom com número da sorte para o sorteio de prêmios.',
          prizesDescription: '1º prêmio: viagem para 2 pessoas • 2º prêmio: smartphone • 3º prêmio: R$ 1.000 em bônus',
          startDate: daysAgo(10),
          endDate: new Date(Date.now() + 35 * DAY),
          isActive: true,
          triggerType: 'PACKAGE_PURCHASE',
          couponsPerAction: 1,
        },
      })
      const ended = await prisma.promotion.create({
        data: {
          title: 'Campanha Inverno 2026',
          description: 'Campanha encerrada. Os cupons foram gerados nas compras de cotas entre junho e agosto.',
          prizesDescription: 'Prêmio principal: R$ 5.000 em bônus',
          startDate: daysAgo(140),
          endDate: daysAgo(55),
          isActive: false,
          triggerType: 'PACKAGE_PURCHASE',
          couponsPerAction: 1,
        },
      })
      const coupon = async (promotionId: bigint, createdDaysAgo: number, extra: Partial<Prisma.CouponUncheckedCreateInput> = {}) =>
        prisma.coupon.create({
          data: {
            promotionId,
            userId: user.id,
            luckyNumber: await uniqueLuckyNumber(),
            sourceType: 'PACKAGE_PURCHASE',
            notes: packages[1] ? `Compra da cota ${packages[1].name}` : null,
            createdAt: daysAgo(createdDaysAgo),
            ...extra,
          },
        })
      await coupon(active.id, 8)
      await coupon(active.id, 5)
      await coupon(active.id, 1)
      await coupon(ended.id, 120)
      await coupon(ended.id, 90, { isWinner: true, wonAt: daysAgo(54) })

      const storeCoupons = await Promise.all([
        prisma.storeDiscountCoupon.create({
          data: { code: 'BEMVINDO10', description: '10% de desconto na primeira compra da loja', discountType: 'PERCENTAGE', value: money(10), maxDiscount: money(100), isActive: true, startsAt: daysAgo(10), expiresAt: new Date(Date.now() + 60 * DAY) },
        }),
        prisma.storeDiscountCoupon.create({
          data: { code: 'LANCAMENTO20', description: '20% de desconto no lançamento da loja', discountType: 'PERCENTAGE', value: money(20), maxUses: 50, usedCount: 50, isActive: true, startsAt: daysAgo(40), expiresAt: new Date(Date.now() + 20 * DAY) },
        }),
        prisma.storeDiscountCoupon.create({
          data: { code: 'INVERNO15', description: '15% de desconto na campanha de inverno', discountType: 'PERCENTAGE', value: money(15), isActive: true, startsAt: daysAgo(140), expiresAt: daysAgo(55) },
        }),
      ])

      registry.promotionIds = [active.id, ended.id].map(String)
      registry.storeCouponIds = storeCoupons.map(c => c.id.toString())
      await writeRegistry(registry)
      log.push('Campanha ativa com 3 cupons, campanha encerrada com 2 (1 sorteado).')
      log.push('Cupons da loja: BEMVINDO10 (ativo), LANCAMENTO20 (esgotado), INVERNO15 (expirado).')
      break
    }

    case 9: {
      const photos = await prisma.userProfilePhoto.deleteMany({ where: { userId: user.id } })
      log.push(photos.count ? `${photos.count} foto(s) removida(s).` : 'A conta já estava sem foto.')
      break
    }

    case 10: {
      log.push('Nenhum dado alterado. Manifest em /favicon/site.webmanifest, ícones 192/512 (Android) e apple-touch-icon 180×180 (iPhone).')
      break
    }

    case 11: {
      const network = await ensureNetwork(user.id)
      if (Number(await getUserBalance(user.id)) < 200) {
        await seedEarnings(user.id, network)
        log.push('Saldo de bônus lançado.')
      }
      await prisma.paymentVoucher.deleteMany({
        where: { OR: [{ beneficiaryId: user.id }, { payerId: user.id }, { beneficiaryId: { in: [...network.values()] } }] },
      })
      const packages = await getActivePackages()
      const cheap = packages[0]
      if (!cheap) throw new DemoError('Nenhum pacote ativo para o Crédito Minerador.')
      // O pagamento exige que o pacote esteja disponível na mineradora do voucher
      await ensureMiners()
      const miner = await prisma.packageMiner.findFirst({ where: { packageId: cheap.id }, select: { minerId: true } })
        .then(link => (link ? { id: link.minerId } : null))
      const pendingCode = await uniqueVoucherCode()
      await prisma.paymentVoucher.create({
        data: {
          code: pendingCode,
          beneficiaryId: network.get('fabio')!,
          packageId: cheap.id,
          minerId: miner?.id ?? null,
          amount: cheap.price,
          description: `Pagamento de cota ${cheap.name}`,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      })
      await prisma.paymentVoucher.create({
        data: {
          code: await uniqueVoucherCode(),
          beneficiaryId: network.get('carla')!,
          payerId: user.id,
          packageId: cheap.id,
          minerId: miner?.id ?? null,
          amount: cheap.price,
          description: `Pagamento de cota ${cheap.name}`,
          status: 'COMPLETED',
          paidAt: daysAgo(66),
          expiresAt: daysAgo(64),
          createdAt: daysAgo(67),
        },
      })
      await prisma.paymentVoucher.create({
        data: {
          code: await uniqueVoucherCode(),
          beneficiaryId: user.id,
          packageId: cheap.id,
          amount: cheap.price,
          description: `Pagamento de cota ${cheap.name}`,
          status: 'EXPIRED',
          expiresAt: daysAgo(20),
          createdAt: daysAgo(22),
        },
      })
      log.push(`Código pendente para pagar na gravação: ${pendingCode} (R$ ${Number(cheap.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, de ${NETWORK.find(n => n.key === 'fabio')!.name}).`)
      log.push('Histórico: um crédito pago e um expirado.')
      break
    }

    default:
      throw new DemoError(`Vídeo ${videoId} não existe.`)
  }

  const balance = Number(await getUserBalance(user.id))
  log.push(`Saldo atual da conta demo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`)
  return log
}

// ---------------------------------------------------------------------------
// Limpeza
// ---------------------------------------------------------------------------

export async function cleanupDemoData() {
  const ids = await getDemoUserIds()
  const registry = await readRegistry()

  const counts = await prisma.$transaction(async tx => {
    const inIds = { in: ids }
    const unilevelIds = (await tx.unilevelUser.findMany({ where: { userId: inIds }, select: { id: true } })).map(u => u.id)

    await tx.clube300Member.deleteMany({ where: { userId: inIds } })
    await tx.unilevelBonus.deleteMany({ where: { userId: { in: unilevelIds } } })
    await tx.unilevelProfitDistribution.deleteMany({ where: { userId: { in: unilevelIds } } })
    await tx.unilevelUserCareer.deleteMany({ where: { userId: inIds } })
    await tx.unilevelUser.deleteMany({ where: { userId: inIds } })
    await tx.userPointsHistory.deleteMany({ where: { userId: inIds } })
    await tx.userActivation.deleteMany({ where: { userId: inIds } })
    await tx.directBonusLimitTracker.deleteMany({ where: { OR: [{ userId: inIds }, { sponsorId: inIds }] } })
    await tx.profitDistribution.deleteMany({ where: { userId: inIds } })
    await tx.cycle.deleteMany({ where: { userId: inIds } })
    await tx.contract.deleteMany({ where: { userId: inIds } })
    await tx.financialTransaction.deleteMany({ where: { userId: inIds } })
    await tx.userPackage.deleteMany({ where: { userId: inIds } })
    const transactions = await tx.transaction.deleteMany({ where: { OR: [{ userId: inIds }, { sourceUserId: inIds }] } })
    await tx.withdrawal.deleteMany({ where: { userId: inIds } })
    await tx.pixKey.deleteMany({ where: { userId: inIds } })
    await tx.paymentVoucher.deleteMany({ where: { OR: [{ beneficiaryId: inIds }, { payerId: inIds }] } })
    await tx.storeOrder.deleteMany({ where: { userId: inIds } })
    await tx.supportTicketMessage.deleteMany({ where: { userId: inIds } })
    await tx.blacklistAudit.deleteMany({ where: { targetUserId: inIds } })
    // Demais relações (fotos, endereços, conta bancária, cupons, carrinho...) são removidas em cascata
    await tx.user.updateMany({ where: { id: inIds }, data: { sponsorId: null, parentId: null } })
    const users = await tx.user.deleteMany({ where: { id: inIds } })

    const promotions = await tx.promotion.deleteMany({ where: { id: { in: registry.promotionIds.map(BigInt) } } })
    const storeCoupons = await tx.storeDiscountCoupon.deleteMany({ where: { id: { in: registry.storeCouponIds.map(BigInt) } } })
    const miners = await tx.miner.deleteMany({ where: { id: { in: registry.minerIds.map(BigInt) } } })
    await tx.parameter.deleteMany({ where: { key: DEMO_REGISTRY_KEY } })

    return {
      users: users.count,
      transactions: transactions.count,
      promotions: promotions.count,
      storeCoupons: storeCoupons.count,
      miners: miners.count,
    }
  }, { timeout: 60000 })

  return counts
}
