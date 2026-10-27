import { PrismaClient } from '../src/generated/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

console.log('🚀 EXECUTANDO TODOS OS SEEDS DO SISTEMA')
console.log('=====================================\n')

async function runAllSeeds() {
  try {
    // 1. Executar seed principal (usuários, pacotes, etc)
    console.log('1️⃣ Executando seed principal...')
    await execAsync('npx prisma db seed')
    console.log('✅ Seed principal concluído!\n')

    // 2. Executar seed de parâmetros
    console.log('2️⃣ Executando seed de parâmetros...')
    await execAsync('npx tsx prisma/seed-parameters.ts')
    console.log('✅ Seed de parâmetros concluído!\n')

    // 3. Executar seed de pacotes
    console.log('2️⃣ Executando seed de pacotes...')
    await execAsync('npx tsx prisma/seed-unilevel.ts')
    console.log('✅ Seed de pacotes concluído!\n')

    // 4. Executar seed de admin package
    console.log('4️⃣ Executando seed de admin package...')
    await execAsync('npx tsx prisma/seed-admin-package.ts')
    console.log('✅ Seed de admin package concluído!\n')

    console.log('3️⃣ Executando seed de admin unilevel...')
    await execAsync('npx tsx prisma/seed-admin-unilevel.ts')
    console.log('✅ Seed de admin unilevel concluído!\n')

    // 5. Executar seed de permissões e roles
    console.log('5️⃣ Executando seed de permissões e roles...')
    await execAsync('npx tsx prisma/seed-permissions.ts')
    console.log('✅ Seed de permissões e roles concluído!\n')

    // 6. Verificar estado final do banco
    console.log('6️⃣ Verificando estado final do banco...')
    const prisma = new PrismaClient()
    
    const stats = {
      users: await prisma.user.count(),
      packages: await prisma.package.count(),
      parameters: await prisma.parameter.count(),
      activeParameters: await prisma.parameter.count({ where: { status: 'ATIVO' } }),
      roles: await prisma.roleModel.count(),
      permissions: await prisma.permission.count(),
    }
    
    await prisma.$disconnect()

    console.log('📊 RESUMO FINAL:')
    console.log('================')
    console.log(`👥 Usuários criados: ${stats.users}`)
    console.log(`📦 Pacotes criados: ${stats.packages}`)
    console.log(`🔧 Parâmetros criados: ${stats.parameters}`)
    console.log(`✅ Parâmetros ativos: ${stats.activeParameters}`)
    console.log(`❌ Parâmetros inativos: ${stats.parameters - stats.activeParameters}`)
    console.log(`🔐 Roles criados: ${stats.roles}`)
    console.log(`🔑 Permissões criadas: ${stats.permissions}`)

    console.log('\n🎉 TODOS OS SEEDS EXECUTADOS COM SUCESSO!')
    console.log('Sistema pronto para uso! 🚀')

  } catch (error) {
    console.error('❌ Erro durante a execução dos seeds:', error)
    process.exit(1)
  }
}

runAllSeeds() 