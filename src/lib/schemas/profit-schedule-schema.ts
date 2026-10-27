import { z } from 'zod'

export const profitScheduleSchema = z.object({
  totalProfit: z.number().positive('O valor total do lucro deve ser maior que zero'),
  minerId: z.coerce.number().int().positive('Selecione uma mineradora válida'),
  scheduledAt: z.string().datetime('Data e hora inválidas'),
  isActive: z.boolean()
})

export type ProfitScheduleInput = z.infer<typeof profitScheduleSchema>

