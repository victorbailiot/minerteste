/**
 * Seed de permissões e roles
 * Sincronizado com o banco de dados em 2026-03-03 via MCP Postgres
 * Dados: permissions, roles, role_permissions
 *
 * Inclui points.read (página de ranking) - será criada se não existir.
 * NÃO altera user_roles nem user_permissions.
 */

import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: 'blacklist.manage', resource: 'blacklist', action: 'manage', description: 'Gerenciar blacklist (adicionar, editar, remover)' },
  { key: 'blacklist.view', resource: 'blacklist', action: 'view', description: 'Visualizar blacklist' },
  { key: 'bonus.adjust', resource: 'bonus', action: 'adjust', description: 'Ajustar bônus' },
  { key: 'bonus.create', resource: 'bonus', action: 'create', description: 'Criar bônus' },
  { key: 'bonus.delete', resource: 'bonus', action: 'delete', description: 'Deletar bônus' },
  { key: 'bonus.read', resource: 'bonus', action: 'read', description: 'Visualizar bônus' },
  { key: 'career.manage', resource: 'career', action: 'manage', description: 'Gerenciar níveis de carreira' },
  { key: 'career.read', resource: 'career', action: 'read', description: 'Visualizar informações de carreira' },
  { key: 'clube300.manage', resource: 'clube300', action: 'manage', description: 'Gerenciar Clube 300' },
  { key: 'clube300.read', resource: 'clube300', action: 'read', description: 'Visualizar membros do Clube 300' },
  { key: 'contracts.approve', resource: 'contracts', action: 'approve', description: 'Aprovar contratos' },
  { key: 'contracts.create', resource: 'contracts', action: 'create', description: 'Criar contratos' },
  { key: 'contracts.read', resource: 'contracts', action: 'read', description: 'Visualizar contratos' },
  { key: 'dashboard.admin', resource: 'dashboard', action: 'admin', description: 'Acessar dashboard administrativo' },
  { key: 'dashboard.user', resource: 'dashboard', action: 'user', description: 'Acessar dashboard de usuário' },
  { key: 'demo.manage', resource: 'demo', action: 'manage', description: 'Preparar dados de demonstração para gravação de vídeos (somente fora da produção)' },
  { key: 'financial.create', resource: 'financial', action: 'create', description: 'Criar registros financeiros' },
  { key: 'financial.read', resource: 'financial', action: 'read', description: 'Visualizar dados financeiros' },
  { key: 'financial.reports', resource: 'financial', action: 'reports', description: 'Gerar relatórios financeiros' },
  { key: 'financial.update', resource: 'financial', action: 'update', description: 'Atualizar registros financeiros' },
  { key: 'logs.export', resource: 'logs', action: 'export', description: 'Exportar logs' },
  { key: 'logs.read', resource: 'logs', action: 'read', description: 'Visualizar logs do sistema' },
  { key: 'network.manage', resource: 'network', action: 'manage', description: 'Gerenciar rede' },
  { key: 'network.read', resource: 'network', action: 'read', description: 'Visualizar rede' },
  { key: 'network.redistribute', resource: 'network', action: 'redistribute', description: 'Redistribuir rede' },
  { key: 'miners.create', resource: 'miners', action: 'create', description: 'Criar mineradoras' },
  { key: 'miners.delete', resource: 'miners', action: 'delete', description: 'Excluir mineradoras' },
  { key: 'miners.read', resource: 'miners', action: 'read', description: 'Visualizar mineradoras' },
  { key: 'miners.update', resource: 'miners', action: 'update', description: 'Atualizar mineradoras' },
  { key: 'packages.activate', resource: 'packages', action: 'activate', description: 'Ativar/Desativar pacotes' },
  { key: 'packages.change_miner', resource: 'packages', action: 'change_miner', description: 'Trocar mineradora do pacote' },
  { key: 'packages.create', resource: 'packages', action: 'create', description: 'Criar pacotes' },
  { key: 'packages.delete', resource: 'packages', action: 'delete', description: 'Deletar pacotes' },
  { key: 'packages.read', resource: 'packages', action: 'read', description: 'Visualizar pacotes' },
  { key: 'packages.update', resource: 'packages', action: 'update', description: 'Atualizar pacotes' },
  { key: 'parameters.create', resource: 'parameters', action: 'create', description: 'Criar parâmetros' },
  { key: 'parameters.delete', resource: 'parameters', action: 'delete', description: 'Deletar parâmetros' },
  { key: 'parameters.read', resource: 'parameters', action: 'read', description: 'Visualizar parâmetros' },
  { key: 'parameters.update', resource: 'parameters', action: 'update', description: 'Atualizar parâmetros' },
  { key: 'permissions.assign', resource: 'permissions', action: 'assign', description: 'Atribuir permissões' },
  { key: 'permissions.read', resource: 'permissions', action: 'read', description: 'Visualizar permissões' },
  { key: 'permissions.revoke', resource: 'permissions', action: 'revoke', description: 'Revogar permissões' },
  { key: 'points.read', resource: 'points', action: 'read', description: 'Visualizar ranking de pontuação' },
  { key: 'points.recalc.queue', resource: 'points', action: 'recalc.queue', description: 'Visualizar fila de recálculo de pontos' },
  { key: 'promotions.coupons', resource: 'promotions', action: 'coupons', description: 'Gerenciar cupons' },
  { key: 'promotions.create', resource: 'promotions', action: 'create', description: 'Criar promoções' },
  { key: 'promotions.delete', resource: 'promotions', action: 'delete', description: 'Deletar promoções' },
  { key: 'promotions.draw', resource: 'promotions', action: 'draw', description: 'Realizar sorteios' },
  { key: 'promotions.read', resource: 'promotions', action: 'read', description: 'Visualizar promoções' },
  { key: 'promotions.update', resource: 'promotions', action: 'update', description: 'Atualizar promoções' },
  { key: 'reports.export', resource: 'reports', action: 'export', description: 'Exportar relatórios' },
  { key: 'reports.financial', resource: 'reports', action: 'financial', description: 'Relatórios financeiros' },
  { key: 'reports.read', resource: 'reports', action: 'read', description: 'Visualizar relatórios' },
  { key: 'roles.assign', resource: 'roles', action: 'assign', description: 'Atribuir roles a usuários' },
  { key: 'roles.create', resource: 'roles', action: 'create', description: 'Criar roles' },
  { key: 'roles.delete', resource: 'roles', action: 'delete', description: 'Deletar roles' },
  { key: 'roles.read', resource: 'roles', action: 'read', description: 'Visualizar roles' },
  { key: 'roles.update', resource: 'roles', action: 'update', description: 'Atualizar roles' },
  { key: 'store.categories.create', resource: 'store', action: 'categories.create', description: 'Criar categorias da loja' },
  { key: 'store.categories.delete', resource: 'store', action: 'categories.delete', description: 'Excluir categorias da loja' },
  { key: 'store.categories.read', resource: 'store', action: 'categories.read', description: 'Visualizar categorias da loja' },
  { key: 'store.categories.update', resource: 'store', action: 'categories.update', description: 'Atualizar categorias da loja' },
  { key: 'store.orders.read', resource: 'store', action: 'orders.read', description: 'Visualizar pedidos da loja' },
  { key: 'store.orders.update', resource: 'store', action: 'orders.update', description: 'Atualizar pedidos da loja' },
  { key: 'store.products.create', resource: 'store', action: 'products.create', description: 'Criar produtos da loja' },
  { key: 'store.products.delete', resource: 'store', action: 'products.delete', description: 'Excluir produtos da loja' },
  { key: 'store.products.read', resource: 'store', action: 'products.read', description: 'Visualizar produtos da loja' },
  { key: 'store.products.update', resource: 'store', action: 'products.update', description: 'Atualizar produtos da loja' },
  { key: 'support.create', resource: 'support', action: 'create', description: 'Criar tickets de suporte' },
  { key: 'support.delete', resource: 'support', action: 'delete', description: 'Deletar tickets de suporte' },
  { key: 'support.read', resource: 'support', action: 'read', description: 'Visualizar tickets de suporte' },
  { key: 'support.update', resource: 'support', action: 'update', description: 'Atualizar tickets de suporte' },
  { key: 'support.write', resource: 'support', action: 'write', description: 'Gerenciar tickets de suporte' },
  { key: 'transactions.approve', resource: 'transactions', action: 'approve', description: 'Aprovar transações' },
  { key: 'transactions.create', resource: 'transactions', action: 'create', description: 'Criar transações' },
  { key: 'transactions.delete', resource: 'transactions', action: 'delete', description: 'Deletar transações' },
  { key: 'transactions.read', resource: 'transactions', action: 'read', description: 'Visualizar transações' },
  { key: 'transactions.update', resource: 'transactions', action: 'update', description: 'Atualizar transações' },
  { key: 'users.activate', resource: 'users', action: 'activate', description: 'Ativar usuários' },
  { key: 'users.create', resource: 'users', action: 'create', description: 'Criar novos usuários' },
  { key: 'users.deactivate', resource: 'users', action: 'deactivate', description: 'Desativar usuários' },
  { key: 'users.delete', resource: 'users', action: 'delete', description: 'Deletar usuários' },
  { key: 'users.read', resource: 'users', action: 'read', description: 'Visualizar usuários' },
  { key: 'users.update', resource: 'users', action: 'update', description: 'Atualizar usuários' },
  { key: 'vouchers.create', resource: 'vouchers', action: 'create', description: 'Criar vouchers' },
  { key: 'vouchers.delete', resource: 'vouchers', action: 'delete', description: 'Deletar vouchers' },
  { key: 'vouchers.read', resource: 'vouchers', action: 'read', description: 'Visualizar vouchers' },
  { key: 'withdrawals.approve', resource: 'withdrawals', action: 'approve', description: 'Aprovar saques' },
  { key: 'withdrawals.process', resource: 'withdrawals', action: 'process', description: 'Processar saques' },
  { key: 'withdrawals.read', resource: 'withdrawals', action: 'read', description: 'Visualizar saques' },
  { key: 'withdrawals.reject', resource: 'withdrawals', action: 'reject', description: 'Rejeitar saques' },
  { key: 'bank.read', resource: 'bank', action: 'read', description: 'Visualizar dados bancários e saldo/extrato Bradesco' },
  { key: 'bank.manage', resource: 'bank', action: 'manage', description: 'Gerenciar integração bancária e realizar transferências Bradesco' },
]

const ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Super Administrador com acesso total ao sistema',
    isSystemRole: true,
    isActive: true,
    permissions: PERMISSIONS.map(p => p.key),
  },
  {
    name: 'ADMIN',
    description: 'Administrador com maioria das permissões administrativas',
    isSystemRole: true,
    isActive: true,
    permissions: [
      'bonus.adjust', 'bonus.read',
      'career.manage', 'career.read',
      'clube300.manage', 'clube300.read',
      'contracts.approve', 'contracts.read',
      'dashboard.admin',
      'financial.read', 'financial.reports',
      'network.read',
      'miners.create', 'miners.read', 'miners.update', 'miners.delete',
      'packages.change_miner', 'packages.read',
      'points.read',
      'promotions.coupons', 'promotions.read',
      'reports.export', 'reports.financial', 'reports.read',
      'support.create', 'support.read', 'support.write',
      'transactions.approve', 'transactions.read', 'transactions.update',
      'users.activate', 'users.deactivate', 'users.read', 'users.update',
      'vouchers.create', 'vouchers.read',
      'withdrawals.approve', 'withdrawals.process', 'withdrawals.read', 'withdrawals.reject',
      'bank.read', 'bank.manage',
      'store.categories.create', 'store.categories.delete', 'store.categories.read', 'store.categories.update',
      'store.orders.read', 'store.orders.update',
      'store.products.create', 'store.products.delete', 'store.products.read', 'store.products.update',
      'demo.manage',
    ],
  },
  {
    name: 'SUPPORT',
    description: 'Suporte com acesso a leitura e aprovação de saques',
    isSystemRole: true,
    isActive: true,
    permissions: [
      'career.manage', 'career.read',
      'network.manage', 'network.read',
      'miners.read',
      'points.read',
      'promotions.coupons', 'promotions.create', 'promotions.draw', 'promotions.read', 'promotions.update',
      'support.create', 'support.read', 'support.update', 'support.write',
      'transactions.read',
      'users.read', 'users.update',
    ],
  },
  {
    name: 'MANAGER',
    description: 'Gerente com acesso a relatórios e leitura de dados',
    isSystemRole: true,
    isActive: true,
    permissions: [
      'bonus.read',
      'career.read',
      'clube300.read',
      'dashboard.admin',
      'financial.read', 'financial.reports',
      'logs.read',
      'network.read',
      'miners.read',
      'packages.read',
      'parameters.read',
      'points.read',
      'reports.export', 'reports.financial', 'reports.read',
      'transactions.read',
      'users.read',
      'withdrawals.read',
      'bank.read',
    ],
  },
  {
    name: 'SUPERVISOR',
    description: 'Algumas funçoes',
    isSystemRole: false,
    isActive: true,
    permissions: [
      'career.manage',
      'career.read',
      'dashboard.admin',
    ],
  },
  {
    name: 'USER',
    description: 'Usuário padrão com permissões básicas',
    isSystemRole: true,
    isActive: true,
    permissions: [
      'dashboard.user',
      'network.read',
    ],
  },
]

async function seedPermissions() {
  console.log('🌱 Iniciando seed de permissões e roles...')

  try {
    console.log('📝 Criando permissões...')
    for (const permission of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
        },
        create: permission,
      })
    }
    console.log(`✅ ${PERMISSIONS.length} permissões criadas/atualizadas`)

    console.log('👥 Criando roles...')
    for (const roleData of ROLES) {
      const { permissions: permissionKeys, ...roleInfo } = roleData

      const role = await prisma.roleModel.upsert({
        where: { name: roleData.name },
        update: {
          description: roleInfo.description,
          isSystemRole: roleInfo.isSystemRole,
          isActive: roleInfo.isActive,
        },
        create: roleInfo,
      })

      const permissions = await prisma.permission.findMany({
        where: { key: { in: permissionKeys } },
      })

      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      })

      for (const permission of permissions) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
            grantedAt: new Date(),
          },
        })
      }

      console.log(`✅ Role "${role.name}" criado/atualizado com ${permissions.length} permissões`)
    }

    console.log('🔐 Verificando role SUPER_ADMIN do usuário 2...')
    const superAdminUser = await prisma.user.findUnique({
      where: {
        id: BigInt(2),
      },
    })

    if (superAdminUser) {
      const superAdminRole = await prisma.roleModel.findUnique({
        where: { name: 'SUPER_ADMIN' },
      })

      if (superAdminRole) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: superAdminUser.id,
              roleId: superAdminRole.id,
            },
          },
          update: {},
          create: {
            userId: superAdminUser.id,
            roleId: superAdminRole.id,
            assignedAt: new Date(),
          },
        })
        console.log('✅ Role SUPER_ADMIN garantido para usuário 2')
      }
    } else {
      console.log('⚠️  Usuário 2 não encontrado para SUPER_ADMIN')
    }

    console.log('🔐 Verificando role ADMIN do usuário 1...')
    const adminUser = await prisma.user.findUnique({
      where: {
        id: BigInt(1),
      },
    })

    if (adminUser) {
      const adminRole = await prisma.roleModel.findUnique({
        where: { name: 'ADMIN' },
      })

      if (adminRole) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: adminUser.id,
              roleId: adminRole.id,
            },
          },
          update: {},
          create: {
            userId: adminUser.id,
            roleId: adminRole.id,
            assignedAt: new Date(),
          },
        })
        console.log('✅ Role ADMIN garantido para usuário 1')
      }
    } else {
      console.log('⚠️  Usuário 1 não encontrado para ADMIN')
    }

    console.log('🎉 Seed de permissões concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao executar seed de permissões:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedPermissions()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedPermissions }
