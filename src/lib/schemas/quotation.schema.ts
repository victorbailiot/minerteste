import { z } from 'zod';

export const quotationSchema = z.object({
  mineralType: z.string().min(2, 'Selecione o tipo de minério'),
  quantity: z
    .number()
    .positive('Quantidade deve ser maior que zero')
    .min(1, 'Quantidade mínima é 1 tonelada'),
  quality: z.string().min(2, 'Selecione a qualidade'),
  location: z.string().min(5, 'Informe o local de entrega'),
  deadline: z.string().min(2, 'Selecione o prazo de entrega'),
  companyName: z.string().min(2, 'Nome da empresa é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  notes: z.string().optional(),
});

export type QuotationInput = z.infer<typeof quotationSchema>;
