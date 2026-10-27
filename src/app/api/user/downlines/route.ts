import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Cache em memória para melhorar performance (apenas quando sem filtros)
interface DownlineCache {
  data: any[]
  timestamp: number
  userId: string
}

const downlineCache: Map<string, DownlineCache> = new Map()
const CACHE_TTL = 60000 // 1 minuto em ms

const BASE_QUERY = `
  WITH RECURSIVE team_tree AS (
    SELECT 
      u.id, u."referralCode", u.name, u.phone, u.email, u."createdAt", u."sponsorId",
      1 as level, CAST(u.id AS TEXT) as path
    FROM users u
    WHERE u."sponsorId" = $1 AND u."isActive" = true
    UNION ALL
    SELECT 
      u.id, u."referralCode", u.name, u.phone, u.email, u."createdAt", u."sponsorId",
      tt.level + 1, tt.path || '/' || CAST(u.id AS TEXT)
    FROM users u
    INNER JOIN team_tree tt ON u."sponsorId" = tt.id
    WHERE u."isActive" = true AND tt.level < 50
  )
  SELECT 
    tt.id, tt."referralCode", tt.name, tt.phone, tt.email, tt.level, tt."createdAt", tt."sponsorId",
    sponsor.name as sponsor_name, sponsor."referralCode" as sponsor_code,
    pkg.name as package_name, pkg.price as package_price, pkg.points as package_points,
    un."totalPoints" as total_points, un."teamVolume" as team_volume,
    cl."careerId" as career_id, cl.name as career_name,
    photo."photoUrl" as photo_url,
    CASE 
      WHEN EXISTS (SELECT 1 FROM user_packages up WHERE up."userId" = tt.id AND up."isActive" = true) 
      THEN true ELSE false 
    END as is_active
  FROM team_tree tt
  LEFT JOIN users sponsor ON tt."sponsorId" = sponsor.id
  LEFT JOIN unilevel_users un ON tt.id = un."userId"
  LEFT JOIN LATERAL (
    SELECT uc."careerId", cl.name FROM unilevel_user_career uc
    INNER JOIN career_levels cl ON uc."careerId" = cl.id
    WHERE uc."userId" = tt.id ORDER BY uc.id DESC LIMIT 1
  ) cl ON true
  LEFT JOIN LATERAL (
    SELECT upp."photoUrl" FROM user_profile_photos upp
    WHERE upp."userId" = tt.id ORDER BY upp."createdAt" DESC LIMIT 1
  ) photo ON true
  LEFT JOIN LATERAL (
    SELECT up."packageId", p.name, p.price, p.points
    FROM user_packages up INNER JOIN packages p ON up."packageId" = p.id
    WHERE up."userId" = tt.id AND up."isActive" = true
    ORDER BY p.price DESC, up."createdAt" DESC LIMIT 1
  ) pkg ON true
`

const processDownline = (d: any) => ({
  id: Number(d.id),
  referralCode: d.referralCode,
  name: d.name,
  phone: d.phone,
  email: d.email,
  level: d.level,
  photoUrl: d.photo_url,
  sponsor: d.sponsor_name ? { referralCode: d.sponsor_code, name: d.sponsor_name } : null,
  package: d.package_name ? {
    name: d.package_name,
    price: Number(d.package_price),
    points: Number(d.package_points)
  } : null,
  graduation: d.career_name || 'Sem graduação',
  status: d.is_active ? 'Ativo' : 'Inativo',
  points: Number(d.total_points) || 0,
  registeredAt: d.createdAt.toISOString()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const name = (searchParams.get('name') || '').trim()
    const level = searchParams.get('level') || ''
    const status = searchParams.get('status') || ''
    const graduation = (searchParams.get('graduation') || '').trim()
    const packageName = (searchParams.get('package') || '').trim()

    const hasFilters = !!(name || level || status || graduation || packageName)

    const now = Date.now()
    const cached = downlineCache.get(userId)
    const cacheValid = cached && (now - cached.timestamp) < CACHE_TTL

    // Sem filtros: usar cache e paginar em memória
    if (!hasFilters) {
      let fullData = cacheValid ? cached!.data : null
      if (!fullData) {
        const fullResult = await prisma.$queryRawUnsafe<any[]>(
          `${BASE_QUERY} ORDER BY tt.level ASC, tt."createdAt" DESC`,
          BigInt(userId)
        )
        fullData = fullResult.map(processDownline)
        downlineCache.set(userId, { data: fullData, timestamp: now, userId })
      }
      const offset = (page - 1) * limit
      const paginated = fullData.slice(offset, offset + limit)
      const total = fullData.length
      const totalPages = Math.ceil(total / limit) || 1
      const filterOptions = {
        levels: [...new Set(fullData.map((d: any) => d.level))].sort((a, b) => a - b),
        graduations: [...new Set(fullData.map((d: any) => d.graduation))].filter(Boolean).sort(),
        packages: [...new Set(fullData.map((d: any) => d.package?.name).filter(Boolean))].sort(),
        statuses: ['Ativo', 'Inativo']
      }
      return NextResponse.json({
        success: true,
        data: {
          downlines: paginated,
          total,
          page,
          limit,
          totalPages,
          filterOptions
        }
      })
    }

    // Com filtros: buscar na API
    const params: any[] = [BigInt(userId)]
    let paramIndex = 2
    const whereClauses: string[] = []

    if (name) {
      params.push(`%${name}%`)
      whereClauses.push(`(base.name ILIKE $${paramIndex})`)
      paramIndex++
    }
    if (level) {
      params.push(parseInt(level, 10))
      whereClauses.push(`(base.level = $${paramIndex})`)
      paramIndex++
    }
    if (status) {
      const isActive = status === 'Ativo'
      params.push(isActive)
      whereClauses.push(`(base.is_active = $${paramIndex})`)
      paramIndex++
    }
    if (graduation) {
      params.push(graduation)
      whereClauses.push(`(COALESCE(base.career_name, 'Sem graduação') = $${paramIndex})`)
      paramIndex++
    }
    if (packageName) {
      params.push(`%${packageName}%`)
      whereClauses.push(`(base.package_name ILIKE $${paramIndex})`)
      paramIndex++
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`
    const filteredQuery = `
      SELECT * FROM (${BASE_QUERY}) AS base ${whereSql}
      ORDER BY base.level ASC, base."createdAt" DESC
    `

    const countQuery = `SELECT COUNT(*)::int as total FROM (${filteredQuery}) AS counted`
    const countResult = await prisma.$queryRawUnsafe<Array<{ total: number }>>(countQuery, ...params)
    const total = countResult[0]?.total ?? 0

    const offset = (page - 1) * limit
    params.push(limit, offset)
    const listQuery = `${filteredQuery} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`

    const downlines = await prisma.$queryRawUnsafe<any[]>(listQuery, ...params)
    const processedDownlines = downlines.map(processDownline)
    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      success: true,
      data: {
        downlines: processedDownlines,
        total,
        page,
        limit,
        totalPages
      }
    })
  } catch (error) {
    console.error('❌ Erro ao buscar downlines:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint para limpar cache (útil para admin)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    downlineCache.delete(userId)

    return NextResponse.json({
      success: true,
      message: 'Cache limpo com sucesso'
    })

  } catch (error) {
    console.error('Erro ao limpar cache:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
