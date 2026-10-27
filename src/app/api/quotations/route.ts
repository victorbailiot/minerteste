import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { quotationSchema } from '@/lib/schemas/quotation.schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validar com Zod
    const validation = quotationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Criar cotação no banco
    const quotation = await prisma.quotation.create({
      data: {
        mineralType: data.mineralType,
        quantity: data.quantity,
        quality: data.quality,
        location: data.location,
        deadline: data.deadline,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        notes: data.notes || null,
        status: 'PENDING',
      },
    });

    // TODO: Enviar email de confirmação para o cliente
    // TODO: Enviar notificação para admin/vendas

    return NextResponse.json(
      {
        success: true,
        message: 'Cotação enviada com sucesso! Entraremos em contato em breve.',
        quotation: {
          id: quotation.id.toString(),
          createdAt: quotation.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar cotação:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar cotação',
        message: 'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
      },
      { status: 500 }
    );
  }
}

// GET - Listar cotações (apenas para admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status ? { status: status as any } : {};

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quotation.count({ where }),
    ]);

    return NextResponse.json({
      quotations: quotations.map((q) => ({
        ...q,
        id: q.id.toString(),
        quantity: q.quantity.toString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Erro ao listar cotações:', error);
    return NextResponse.json(
      { error: 'Erro ao listar cotações' },
      { status: 500 }
    );
  }
}
