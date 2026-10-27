import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function seedStore() {
  console.log('🌱 Iniciando seed da loja virtual...')

  // 1. Criar/atualizar Categorias (idempotente)
  console.log('📁 Criando categorias...')
  
  const categoriaEletronicos = await prisma.storeCategory.upsert({
    where: { slug: 'eletronicos' },
    create: {
      name: 'Eletrônicos',
      description: 'Produtos eletrônicos e tecnologia',
      slug: 'eletronicos',
      isActive: true,
      sortOrder: 1
    },
    update: {}
  })

  const categoriaModa = await prisma.storeCategory.upsert({
    where: { slug: 'moda' },
    create: {
      name: 'Moda',
      description: 'Roupas, calçados e acessórios',
      slug: 'moda',
      isActive: true,
      sortOrder: 2
    },
    update: {}
  })

  const categoriaCasa = await prisma.storeCategory.upsert({
    where: { slug: 'casa-decoracao' },
    create: {
      name: 'Casa e Decoração',
      description: 'Produtos para casa e decoração',
      slug: 'casa-decoracao',
      isActive: true,
      sortOrder: 3
    },
    update: {}
  })

  const categoriaLivros = await prisma.storeCategory.upsert({
    where: { slug: 'livros-digitais' },
    create: {
      name: 'Livros Digitais',
      description: 'E-books e cursos online',
      slug: 'livros-digitais',
      isActive: true,
      sortOrder: 4
    },
    update: {}
  })

  console.log('✅ Categorias criadas')

  // 2. Criar Produtos
  console.log('📦 Criando produtos...')

  const produtos = [
    {
      name: 'Notebook Gamer Pro',
      description: 'Notebook de alta performance para jogos e trabalho pesado. Processador Intel Core i7, 16GB RAM, SSD 512GB, Placa de vídeo RTX 3060.',
      shortDesc: 'Notebook Gamer com RTX 3060',
      sku: 'NOTE-GAMER-001',
      slug: 'notebook-gamer-pro',
      price: 4999.99,
      comparePrice: 5999.99,
      categoryId: categoriaEletronicos.id,
      type: 'PHYSICAL' as const,
      stock: 15,
      weight: 2.5,
      width: 35,
      height: 25,
      length: 3,
      images: [],
      featured: true,
      tags: ['notebook', 'gamer', 'rtx'],
      specifications: {
        'Processador': 'Intel Core i7 11ª Geração',
        'Memória RAM': '16GB DDR4',
        'Armazenamento': 'SSD 512GB NVMe',
        'Placa de Vídeo': 'NVIDIA RTX 3060 6GB',
        'Tela': '15.6" Full HD 144Hz',
        'Sistema Operacional': 'Windows 11'
      }
    },
    {
      name: 'Smartphone Premium 5G',
      description: 'Smartphone top de linha com câmera de 108MP, tela AMOLED de 6.7", processador Snapdragon 888 e bateria de 5000mAh.',
      shortDesc: 'Smartphone 5G 108MP',
      sku: 'PHONE-PREM-001',
      slug: 'smartphone-premium-5g',
      price: 2499.99,
      comparePrice: 3299.99,
      categoryId: categoriaEletronicos.id,
      type: 'PHYSICAL' as const,
      stock: 30,
      weight: 0.2,
      width: 16,
      height: 8,
      length: 1,
      images: [],
      featured: true,
      tags: ['smartphone', '5g', 'camera'],
      specifications: {
        'Tela': '6.7" AMOLED',
        'Câmera': '108MP + 12MP + 5MP',
        'Processador': 'Snapdragon 888',
        'RAM': '12GB',
        'Armazenamento': '256GB',
        'Bateria': '5000mAh'
      }
    },
    {
      name: 'Curso Completo de Python',
      description: 'Curso online completo de Python do zero ao avançado. Mais de 200 aulas em vídeo, projetos práticos e certificado de conclusão.',
      shortDesc: 'Curso Python do Zero ao Avançado',
      sku: 'CURSO-PY-001',
      slug: 'curso-completo-python',
      price: 199.99,
      comparePrice: 399.99,
      categoryId: categoriaLivros.id,
      type: 'DIGITAL' as const,
      stock: 9999,
      images: [],
      featured: true,
      tags: ['curso', 'python', 'programacao'],
      specifications: {
        'Duração': '40 horas',
        'Aulas': '200+ vídeos',
        'Nível': 'Iniciante ao Avançado',
        'Certificado': 'Sim',
        'Acesso': 'Vitalício'
      }
    },
    {
      name: 'Fone de Ouvido Bluetooth',
      description: 'Fone de ouvido sem fio com cancelamento de ruído ativo, bateria de 30 horas e qualidade de áudio premium.',
      shortDesc: 'Fone Bluetooth com ANC',
      sku: 'FONE-BT-001',
      slug: 'fone-ouvido-bluetooth',
      price: 299.99,
      comparePrice: 449.99,
      categoryId: categoriaEletronicos.id,
      type: 'PHYSICAL' as const,
      stock: 50,
      weight: 0.3,
      width: 20,
      height: 18,
      length: 8,
      images: [],
      featured: false,
      tags: ['fone', 'bluetooth', 'anc']
    },
    {
      name: 'Camiseta Premium Cotton',
      description: 'Camiseta 100% algodão premium, confortável e durável. Disponível em várias cores.',
      shortDesc: 'Camiseta 100% Algodão',
      sku: 'CAM-PREM-001',
      slug: 'camiseta-premium-cotton',
      price: 79.99,
      comparePrice: 129.99,
      categoryId: categoriaModa.id,
      type: 'PHYSICAL' as const,
      stock: 100,
      weight: 0.2,
      width: 30,
      height: 40,
      length: 1,
      images: [],
      featured: false,
      tags: ['camiseta', 'algodao', 'moda']
    },
    {
      name: 'Kit Decoração Moderna',
      description: 'Kit com 5 peças decorativas modernas para sala de estar. Inclui vasos, quadros e objetos decorativos.',
      shortDesc: 'Kit 5 Peças Decorativas',
      sku: 'DECO-KIT-001',
      slug: 'kit-decoracao-moderna',
      price: 349.99,
      categoryId: categoriaCasa.id,
      type: 'PHYSICAL' as const,
      stock: 25,
      weight: 3.0,
      width: 40,
      height: 30,
      length: 20,
      images: [],
      featured: false,
      tags: ['decoracao', 'casa', 'kit']
    }
  ]

  for (const produtoData of produtos) {
    await prisma.storeProduct.upsert({
      where: { sku: produtoData.sku },
      create: produtoData,
      update: {}
    })
  }

  console.log('✅ Produtos criados')

  // 3. Criar Métodos de Envio (só cria se não existir)
  console.log('🚚 Criando métodos de envio...')

  const metodosEnvio = [
    { name: 'PAC - Correios', description: 'Entrega econômica dos Correios', carrier: 'Correios', service: 'PAC', estimatedDays: 10, isActive: true },
    { name: 'SEDEX - Correios', description: 'Entrega rápida dos Correios', carrier: 'Correios', service: 'SEDEX', estimatedDays: 3, isActive: true },
    { name: 'Expresso - Transportadora', description: 'Entrega expressa via transportadora', carrier: 'Transportadora', service: 'Expresso', estimatedDays: 2, isActive: true }
  ]
  for (const metodo of metodosEnvio) {
    const existe = await prisma.storeShippingMethod.findFirst({
      where: { carrier: metodo.carrier, service: metodo.service }
    })
    if (!existe) {
      await prisma.storeShippingMethod.create({ data: metodo })
    }
  }

  console.log('✅ Métodos de envio criados')

  // 4. Criar/atualizar Cupom de Exemplo (idempotente)
  console.log('🎟️ Criando cupom de exemplo...')

  await prisma.storeDiscountCoupon.upsert({
    where: { code: 'BEMVINDO10' },
    create: {
      code: 'BEMVINDO10',
      description: 'Cupom de boas-vindas - 10% de desconto',
      discountType: 'PERCENTAGE',
      value: 10,
      minPurchase: 100,
      maxUses: 100,
      isActive: true,
      expiresAt: new Date('2025-12-31')
    },
    update: {}
  })

  console.log('✅ Cupom criado')

  console.log('🎉 Seed da loja concluído com sucesso!')
}

seedStore()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
