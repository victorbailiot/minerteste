import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateCategorySchema, categoryIdSchema } from '@/lib/validations/store'

// GET - Buscar categoria por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const validated = categoryIdSchema.parse({ id: params.id })
    
    const category = await prisma.storeCategory.findUnique({
      where: { id: BigInt(validated.id) },
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
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      category: {
        ...category,
        id: category.id.toString(),
        parentId: category.parentId?.toString(),
        parent: category.parent ? {
          ...category.parent,
          id: category.parent.id.toString()
        } : undefined,
        children: category.children.map(c => ({
          ...c,
          id: c.id.toString()
        })),
        productsCount: category._count.products
      }
    })
  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar categoria', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const validated = categoryIdSchema.parse({ id: params.id })
    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    // Verificar se categoria existe
    const existing = await prisma.storeCategory.findUnique({
      where: { id: BigInt(validated.id) }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    // Se mudando slug, verificar duplicação
    if (validatedData.slug && validatedData.slug !== existing.slug) {
      const slugExists = await prisma.storeCategory.findUnique({
        where: { slug: validatedData.slug }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Já existe uma categoria com este slug' },
          { status: 400 }
        )
      }
    }

    const category = await prisma.storeCategory.update({
      where: { id: BigInt(validated.id) },
      data: {
        ...validatedData,
        parentId: validatedData.parentId ? BigInt(validatedData.parentId) : undefined
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
      message: 'Categoria atualizada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar categoria', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// DELETE - Remover categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const validated = categoryIdSchema.parse({ id: params.id })

    // Verificar se tem produtos associados
    const productsCount = await prisma.storeProduct.count({
      where: { categoryId: BigInt(validated.id) }
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { error: `Não é possível deletar. Existem ${productsCount} produto(s) nesta categoria` },
        { status: 400 }
      )
    }

    // Verificar se tem subcategorias
    const childrenCount = await prisma.storeCategory.count({
      where: { parentId: BigInt(validated.id) }
    })

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: `Não é possível deletar. Existem ${childrenCount} subcategoria(s)` },
        { status: 400 }
      )
    }

    await prisma.storeCategory.delete({
      where: { id: BigInt(validated.id) }
    })

    return NextResponse.json({
      success: true,
      message: 'Categoria removida com sucesso'
    })
  } catch (error) {
    console.error('Erro ao remover categoria:', error)
    return NextResponse.json(
      { error: 'Erro ao remover categoria', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
