/**
 * Tipos para Pagamento em Lote (Pagamentos Lote) - API Bradesco
 * Conforme documentação: POST /v1.1/pagamentos-lote
 * tipoPagamento: 05 = PIX
 */

/** Item de pagamento PIX na lista */
export interface PagamentoLoteItemPix {
  idTransacao: string
  valor: string
  favorecido: {
    nome: string
    cpfCnpj: string
  }
  pix: {
    chave: string
    tipo: 'EMAIL' | 'CPF' | 'CNPJ' | 'TELEFONE' | 'ALEATORIA'
  }
}

/** Item de pagamento com conta bancária (AGENCIACONTA) */
export interface PagamentoLoteItemConta {
  idTransacao: string
  valor: string
  favorecido: {
    nome: string
    cpfCnpj: string
  }
  conta?: {
    ispb: string
    agencia: string
    conta: string
    digitoConta: string
    tipoConta: 'CONTA_CORRENTE' | 'CONTA_POUPANCA'
  }
}

export type PagamentoLoteItem = PagamentoLoteItemPix | PagamentoLoteItemConta

/** Request para Pagamento em Lote */
export interface PagamentoLoteRequest {
  idLote: string
  tipoPagamento: '05' // 05 = PIX
  dataPagamento: string // YYYY-MM-DD
  listaPagamentos: PagamentoLoteItem[]
}

/** Resposta da API de Pagamento em Lote */
export interface PagamentoLoteResponse {
  idLote?: string
  status?: string
  codMensagem?: string
  msg?: string
  listaResultados?: Array<{
    idTransacao: string
    status?: string
    e2eid?: string
    codMensagem?: string
    msg?: string
  }>
  [key: string]: unknown
}
