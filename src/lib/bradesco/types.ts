/**
 * Tipos e interfaces da API Pix Bradesco
 * Baseados na coleção Postman oficial de transferências Pix
 */

// ===== ENUMS =====

export type PixKeyType = 'AGENCIACONTA' | 'EVP' | 'TELEFONE' | 'EMAIL' | 'CPFCNPJ'

export type PixAccountType =
  | 'CONTA_CORRENTE'
  | 'CONTA_POUPANCA'
  | 'CONTA_SALARIO'
  | 'CONTA_PAGAMENTO'

// ===== PAGADOR (QUEM ENVIA) =====

/**
 * Pagador identificado por agência e conta Bradesco
 */
export interface PixPayerByAccount {
  tipoChave: 'AGENCIACONTA'
  agencia: string
  conta: string
}

/**
 * Pagador identificado por chave Pix (EVP, Telefone, Email, CPF/CNPJ)
 */
export interface PixPayerByKey {
  tipoChave: Exclude<PixKeyType, 'AGENCIACONTA'>
  chavePix: string
}

export type PixPayer = PixPayerByAccount | PixPayerByKey

// ===== RECEBEDOR (QUEM RECEBE) =====

/**
 * Dados do recebedor para transferência Pix
 * Sempre com dados bancários completos (conta + favorecido)
 */
/**
 * Recebedor via chave PIX (EVP, TELEFONE, EMAIL, CPFCNPJ)
 * Não exige dados bancários completos.
 */
export interface PixReceiverByKey {
  tipoChave: Exclude<PixKeyType, 'AGENCIACONTA'>
  chavePix: string
  cpfCnpj: string
  nomeFavorecido: string
  banco?: string
}

/**
 * Recebedor via agência + conta (AGENCIACONTA)
 * Exige dados bancários completos.
 */
export interface PixReceiverByAccount {
  tipoChave: 'AGENCIACONTA'
  cpfCnpj: string
  nomeFavorecido: string
  ispb: string
  agencia: string
  conta: string
  digitoConta: string
  tipoConta: PixAccountType
  banco?: string
  chavePix?: string
}

export type PixReceiver = PixReceiverByKey | PixReceiverByAccount

// ===== REQUESTS =====

/**
 * Request para solicitar uma transferência Pix
 * Conforme documentação Bradesco - /v1/spi/solicitar-transferencia
 */
export interface PixTransferRequest {
  idtransacao: string
  pagador: PixPayer
  recebedor: PixReceiver
  valor: string
  descricao?: string
}

/**
 * Parâmetros para consultar o status de uma transferência Pix
 * Conforme documentação Bradesco - /v1/spi/consulta/transferencia/{idtransacao}/{e2eid}
 */
export interface PixTransferQueryParams {
  idtransacao: string
  e2eid: string
}

// ===== RESPONSES =====

/**
 * Resposta da solicitação de transferência Pix
 */
export interface PixTransferResponse {
  idtransacao?: string
  e2eid?: string
  status?: string
  dataCriacao?: string
  dataProcessamento?: string
  valor?: string
  descricao?: string
  pagador?: PixPayer
  recebedor?: PixReceiver
  mensagem?: string
  codigoRetorno?: string
  [key: string]: unknown
}

/**
 * Resposta da consulta de status de transferência Pix
 */
export interface PixTransferStatusResponse {
  idtransacao?: string
  e2eid?: string
  status?: string
  dataCriacao?: string
  dataProcessamento?: string
  valor?: string
  descricao?: string
  pagador?: PixPayer
  recebedor?: PixReceiver
  motivoRejeicao?: string
  codigoRetorno?: string
  [key: string]: unknown
}

/**
 * Resposta do endpoint de token OAuth2 Bradesco
 */
export interface BradescoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

// ===== ERROS =====

/**
 * Estrutura de erro retornado pela API Bradesco
 */
export interface BradescoApiErrorPayload {
  codigo?: string
  /** Erro em APIs de fornecimento (ex.: saldo/extrato) */
  codigoErro?: string
  mensagem?: string
  descricao?: string
  [key: string]: unknown
}
