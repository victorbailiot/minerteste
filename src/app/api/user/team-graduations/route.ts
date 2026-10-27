import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
    const search = (url.searchParams.get('search') || '').trim()
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const careerId = url.searchParams.get('careerId')

    const loggedUserId = BigInt(session.user.id)

    // CTE recursiva para capturar todos os IDs da equipe (downlines)
    // Em seguida usamos para filtrar as graduações do histórico
    const params: any[] = []
    params.push(loggedUserId)

    let searchFilterSql = ''
    if (search) {
      params.push(`%${search}%`)
      params.push(`%${search}%`)
      searchFilterSql = `AND (u.name ILIKE $${params.length - 1} OR u."referralCode" ILIKE $${params.length})`
    }

    let dateFilterSql = ''
    if (startDate) {
      params.push(new Date(startDate))
      dateFilterSql += ` AND uc."graduatedAt" >= $${params.length}`
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      params.push(end)
      dateFilterSql += ` AND uc."graduatedAt" <= $${params.length}`
    }

    if (careerId) {
      params.push(BigInt(careerId))
      dateFilterSql += ` AND uc."careerId" = $${params.length}`
    }

    const whereSql = `WHERE 1=1 ${searchFilterSql} ${dateFilterSql}`.trim()

    // CTE recursiva: inclui o próprio usuário logado (level 0) + equipe (indicados e descendentes)
    const teamTreeCte = `
      WITH RECURSIVE team_tree AS (
        SELECT id, "sponsorId", 0 AS level
        FROM users
        WHERE id = $1
        UNION ALL
        SELECT u.id, u."sponsorId", tt.level + 1
        FROM users u
        INNER JOIN team_tree tt ON u."sponsorId" = tt.id
        WHERE tt.level < 100
      )
    `

    // Contagem total
    const countQuery = `
      ${teamTreeCte}
      SELECT COUNT(*)::int AS total
      FROM unilevel_user_career uc
      INNER JOIN users u ON u.id = uc."userId"
      INNER JOIN team_tree tt ON tt.id = uc."userId"
      ${whereSql}
    `

    const countResult = await prisma.$queryRawUnsafe<Array<{ total: number }>>(countQuery, ...params)
    const total = countResult[0]?.total || 0

    // Paginação
    const offset = (page - 1) * limit

    // Buscar registros paginados com dados relacionados
    const listQuery = `
      ${teamTreeCte}
      SELECT 
        uc.id,
        uc."userId",
        u.name AS user_name,
        u.email AS user_email,
        u."referralCode" AS referral_code,
        uc."careerId" AS career_id,
        cl.name AS career_name,
        cl."requiredPoints" AS required_points,
        cl."maxTeamVolumePercent" AS max_team_volume_percent,
        cl."indirectBonusLevels" AS indirect_bonus_levels,
        cl."reactivationLevels" AS reactivation_levels,
        cl."extraProfitPercent" AS extra_profit_percent,
        cl."travelBonus" AS travel_bonus,
        cl."travelValue" AS travel_value,
        uc."totalNetworkPoints" AS total_network_points,
        uc."validPoints" AS valid_points,
        uc."graduatedAt" AS graduated_at,
        photo."photoUrl" AS photo_url,
        flyer.id AS flyer_id,
        flyer."textColor" AS flyer_text_color,
        flyer."backgroundImage" AS flyer_background_image
      FROM unilevel_user_career uc
      INNER JOIN users u ON u.id = uc."userId"
      INNER JOIN team_tree tt ON tt.id = uc."userId"
      INNER JOIN career_levels cl ON cl.id = uc."careerId"
      LEFT JOIN LATERAL (
        SELECT upp."photoUrl"
        FROM user_profile_photos upp
        WHERE upp."userId" = u.id
        ORDER BY upp."createdAt" DESC
        LIMIT 1
      ) photo ON true
      LEFT JOIN LATERAL (
        SELECT f.id, f."textColor", f."backgroundImage"
        FROM flyers f
        WHERE f."careerLevelId" = cl.id
        ORDER BY f."createdAt" DESC
        LIMIT 1
      ) flyer ON true
      ${whereSql}
      ORDER BY uc."graduatedAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const rows = await prisma.$queryRawUnsafe<any[]>(listQuery, ...params)

    const graduations = rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      userName: r.user_name,
      userEmail: r.user_email,
      referralCode: r.referral_code,
      photoUrl: r.photo_url || null,
      careerLevel: r.career_name,
      requiredPoints: Number(r.required_points) || 0,
      totalNetworkPoints: Number(r.total_network_points) || 0,
      validPoints: Number(r.valid_points) || 0,
      maxTeamVolumePercent: String(r.max_team_volume_percent),
      indirectBonusLevels: Number(r.indirect_bonus_levels) || 0,
      reactivationLevels: Number(r.reactivation_levels) || 0,
      extraProfitPercent: String(r.extra_profit_percent),
      travelBonus: r.travel_bonus,
      travelValue: r.travel_value ? String(r.travel_value) : null,
      flyer: r.flyer_id ? { id: String(r.flyer_id), textColor: r.flyer_text_color, backgroundImage: r.flyer_background_image } : null,
      graduatedAt: new Date(r.graduated_at).toISOString()
    }))

    return NextResponse.json({
      graduations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar graduados da equipe:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}


