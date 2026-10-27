import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const autoActivationSchema = z.object({
  autoActivation: z.boolean()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { autoActivation: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ autoActivation: user.autoActivation })
  } catch (error) {
    console.error('Error fetching auto-activation status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    const body = await request.json()
    const { autoActivation } = autoActivationSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: userId },
      data: { autoActivation },
      select: { autoActivation: true }
    })

    return NextResponse.json({ 
      autoActivation: user.autoActivation,
      message: `Ativação automática ${autoActivation ? 'ativada' : 'desativada'} com sucesso` 
    })
  } catch (error) {
    console.error('Error updating auto-activation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 