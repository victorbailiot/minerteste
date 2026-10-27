import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  categoryListQuerySchema,
  createCategorySchema,
} from '@/lib/validations/store'

// GET - Listar categorias
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = categoryListQuerySchema.parse(queryParams)

    const where: any = {}
    if (validatedQuery.parentId) {
      where.parentId = BigInt(validatedQuery.parentId)
    }
    if (validatedQuery.isActive !== undefined) {
      where.isActive = validatedQuery.isActive
    }

    const categories = await prisma.storeCategory.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true, slug: true }
        },
        children: {
          select: { id: true, name: true, slug: true, isActive: true }
        },
        _count: {
          select: { products: true }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    const serialized = categories.map(cat => ({
      ...cat,
      id: cat.id.toString(),
      parentId: cat.parentId?.toString(),
      parent: cat.parent ? {
        ...cat.parent,
        id: cat.parent.id.toString()
      } : undefined,
      children: cat.children.map(c => ({
        ...c,
        id: c.id.toString()
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

// POST - Criar categoria
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createCategorySchema.parse(body)

    // Verificar se slug já existe
    const existing = await prisma.storeCategory.findUnique({
      where: { slug: validatedData.slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este slug' },
        { status: 400 }
      )
    }

    const category = await prisma.storeCategory.create({
      data: {
        ...validatedData,
        parentId: validatedData.parentId ? BigInt(validatedData.parentId) : null
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      category: {
        ...category,
        id: category.id.toString(),
        parentId: category.parentId?.toString(),
        parent: category.parent ? {
          ...category.parent,
          id: category.parent.id.toString()
        } : undefined
      },
      message: 'Categoria criada com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json(
      { error: 'Erro ao criar categoria', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
