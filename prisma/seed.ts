import { PrismaClient } from '../src/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')
 
  // Criar usuário administrador
  console.log('👤 Criando usuário administrador...')
  
  const hashedPassword = await bcrypt.hash('asdfqw', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@miner.com' },
    create: {
      name: 'Administrador',
      email: 'admin@miner.com',
      password: hashedPassword,
      phone: '(11) 99999-9999',
      referralCode: '134679',
      // leftPoints e rightPoints removidos - agora usa tabela UserPointsHistory
      isActive: true,
      role: 'ADMIN'
    },
    update: {}
  })

  console.log('✅ Administrador criado com sucesso!')

  // Criar usuários de teste
  // console.log('👥 Criando usuários de teste...')
  
  // const testUsers = [
  //   {
  //     name: 'João Silva',
  //     email: 'joao@test.com',
  //     password: hashedPassword,
  //     phone: '(11) 11111-1111'
  //   },
  //   {
  //     name: 'Maria Santos',
  //     email: 'maria@test.com',
  //     password: hashedPassword,
  //     phone: '(11) 22222-2222'
  //   },
  //   {
  //     name: 'Pedro Oliveira',
  //     email: 'pedro@test.com',
  //     password: hashedPassword,
  //     phone: '(11) 33333-3333'
  //   }
  // ]

  // for (const userData of testUsers) {
  //   const hashedUserPassword = await bcrypt.hash(userData.password, 10)
    
  //   await prisma.user.upsert({
  //     where: { email: userData.email },
  //     create: {
  //       name: userData.name,
  //       email: userData.email,
  //       password: hashedUserPassword,
  //       phone: userData.phone,
  //       // leftPoints e rightPoints removidos - agora usa tabela UserPointsHistory
  //       isActive: true,
  //       role: 'USER',
  //       sponsorId: admin.id
  //     },
  //     update: {}
  //   })
  // }

  console.log('✅ Usuários de teste criados com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 