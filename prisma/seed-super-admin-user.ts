import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Atribuindo role SUPER_ADMIN ao usuário ID=1...')

  try {
    // 1. Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: BigInt(1) }
    })

    if (!user) {
      console.error('❌ Usuário com ID=1 não encontrado!')
      return
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.email})`)

    // 2. Buscar o role SUPER_ADMIN
    const superAdminRole = await prisma.roleModel.findFirst({
      where: { name: 'SUPER_ADMIN' }
    })

    if (!superAdminRole) {
      console.error('❌ Role SUPER_ADMIN não encontrado! Execute o seed de permissões primeiro.')
      return
    }

    console.log(`✅ Role SUPER_ADMIN encontrado (ID: ${superAdminRole.id})`)

    // 3. Verificar se o usuário já tem o role
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: BigInt(1),
        roleId: superAdminRole.id
      }
    })

    if (existingUserRole) {
      console.log('⚠️  Usuário já possui o role SUPER_ADMIN!')
      return
    }

    // 4. Atribuir o role ao usuário
    await prisma.userRole.create({
      data: {
        userId: BigInt(1),
        roleId: superAdminRole.id,
        assignedBy: BigInt(1), // Auto-atribuído
        assignedAt: new Date(),
        expiresAt: null // Sem expiração
      }
    })

    console.log('✅ Role SUPER_ADMIN atribuído com sucesso ao usuário ID=1!')

    // 5. Criar registro de auditoria
    await prisma.permissionAudit.create({
      data: {
        actionType: 'ROLE_ASSIGNED_TO_USER',
        performedBy: BigInt(1),
        targetUserId: BigInt(1),
        targetRoleId: superAdminRole.id,
        reason: 'Atribuição inicial de SUPER_ADMIN via seed',
        oldValue: null,
        newValue: JSON.stringify({
          roleName: 'SUPER_ADMIN',
          userId: 1
        }),
        createdAt: new Date()
      }
    })

    console.log('✅ Auditoria criada com sucesso!')

    // 6. Exibir resumo
    console.log('\n📊 Resumo da operação:')
    console.log('─────────────────────────────────────────')
    console.log(`👤 Usuário: ${user.name}`)
    console.log(`📧 Email: ${user.email}`)
    console.log(`🛡️  Role: SUPER_ADMIN`)
    console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
    console.log('─────────────────────────────────────────')
    console.log('\n🎉 Usuário agora tem acesso completo ao sistema!')

  } catch (error) {
    console.error('❌ Erro ao atribuir role:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

