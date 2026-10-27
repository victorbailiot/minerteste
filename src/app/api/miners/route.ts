import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const packageId = searchParams.get('packageId')

    const miners = await prisma.miner.findMany({
      where: packageId
        ? {
            packageMiners: {
              some: {
                packageId: BigInt(packageId)
              }
            }
          }
        : undefined,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: miners.map((miner) => ({
        id: miner.id.toString(),
        name: miner.name,
        address: miner.address,
        city: miner.city,
        state: miner.state
      }))
    })
  } catch (error) {
    console.error('Erro ao buscar mineradoras:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar mineradoras' },
      { status: 500 }
    )
  }
}
