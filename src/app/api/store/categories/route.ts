import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional()
})

// GET - Listar categorias públicas
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.storeCategory.findMany({
      where: { isActive: true },
      include: {
        parent: {
          select: { id: true, name: true, slug: true }
        },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, imageUrl: true }
        },
        _count: {
          select: { 
            products: {
              where: {
                isActive: true,
                stock: { gt: 0 }
              }
            }
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    const serialized = categories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      description: cat.description,
      slug: cat.slug,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId?.toString(),
      sortOrder: cat.sortOrder,
      parent: cat.parent ? {
        id: cat.parent.id.toString(),
        name: cat.parent.name,
        slug: cat.parent.slug
      } : undefined,
      children: cat.children.map(c => ({
        id: c.id.toString(),
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl
      })),
      productsCount: cat._count.products
    }))

    return NextResponse.json({
      success: true,
      categories: serialized,
      total: serialized.length
    })
  } catch (error) {
    console.error('Erro ao listar categorias:', error)
    return NextResponse.json(
      { error: 'Erro ao listar categorias', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// POST - Criar nova categoria (requer autenticação de admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = categorySchema.parse(body)

    // Gerar slug a partir do nome
    const slug = validatedData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Verificar se slug já existe
    const existingCategory = await prisma.storeCategory.findUnique({
      where: { slug }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este nome' },
        { status: 400 }
      )
    }

    // Criar categoria
    const newCategory = await prisma.storeCategory.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        slug,
        isActive: true,
        sortOrder: 0
      }
    })

    return NextResponse.json({
      success: true,
      category: {
        id: newCategory.id.toString(),
        name: newCategory.name,
        description: newCategory.description,
        slug: newCategory.slug
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}
