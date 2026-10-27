/**
 * Tipos da API Fornecimento de Saldos e Extratos de Contas (Bradesco Open API v1).
 * Baseados na coleção Postman "Saldo e extrato | cliente".
 */

/** Parâmetros GET /fornecimento-saldos-contas/saldos */
export interface ConsultaSaldoParams {
  agencia: string
  conta: string
  tipoOperacao?: string
}

/** Parâmetros GET /fornecimento-extratos-contas/extratos — datas enviadas como DDMMYYYY na query */
export interface ConsultaExtratoParams {
  agencia: string
  conta: string
  /** Ex.: conta corrente → "cc" (conforme contrato Bradesco) */
  tipo: string
  dataInicio: Date | string
  dataFim: Date | string
}

/** Bloco com retorno mínimo da mainframe Bradesco */
export interface BradescoContasRetornoBase {
  codigoRetorno?: string | null
  mensagem?: string | null
}

export interface LancamentoSaldoLinha {
  nomeProduto?: string
  nomeProdutoResumido?: string
  codigoProduto?: number
  identificadorSaldo?: string
  dataLancamentoDb2?: string
  valorLancamento?: string
  sinalSaldo?: string
}

export interface SaldoContaBloco extends BradescoContasRetornoBase {
  identificaoCliente?: string | null
  razaoConta?: string | null
  numeroConta?: string | null
  digitoConta?: string | null
  nomeCliente?: string | null
  statusContaCorrente?: string | null
  statusContaPoupanca?: string | null
  identificadorTipoConta?: string | null
  statusCoberturaAutomatica?: string | null
  contaPoupancaFacil?: string | null
  dataUltimaAtualizacao?: string | null
  identificadorModalidadeConta?: string | null
  dataProximoPagamentoInss?: string | null
  dataVencimentoCartaoInss?: string | null
  statusCartaoInss?: string | null
  quantidadeLancamentos?: string | null
  lstLancamentosSaldos?: LancamentoSaldoLinha[] | null
}

export interface SaldoAplicacaoBloco extends BradescoContasRetornoBase {
  quantidadeLancamentos?: string | null
  lstLancamentosSaldos?: LancamentoSaldoLinha[] | null
}

/** Resposta GET saldos — sucesso típico traz saldoCC, saldoCP e opcionalmente saldoAplicacaoCC */
export interface ConsultaSaldoResponse {
  saldoCC?: SaldoContaBloco | null
  saldoCP?: SaldoContaBloco | null
  saldoAplicacaoCC?: SaldoAplicacaoBloco | null
  codigoErro?: string
  descricao?: string
}

export interface LancamentoExtratoMovimento {
  sinalSaldo?: string
  valorLancamento?: string
  segundaLinhalLancamento?: string
  sinalLancamento?: string
  identificacaoSubCodigo?: string
  numeroDocumento?: string
  valorSaldoAposLancamento?: string
  dataLancamento?: string
  codigoLancamento?: string
  descritivoLancamentoAbreviado?: string
  descritivoLancamentoCompleto?: string
}

/** listaLancamentos usa chaves dinâmicas: "Saldo Anterior", "Ultimos Lancamentos", etc. */
export type ListaLancamentosExtrato = Record<string, LancamentoExtratoMovimento[]>

export interface ExtratoUltimosLancamentosBloco extends BradescoContasRetornoBase {
  identificaoCliente?: string | null
  razaoConta?: string | null
  numeroConta?: string | null
  digitoConta?: string | null
  nomeCliente?: string | null
  quantidadeLancamentos?: string | null
  statusContaCorrente?: string | null
  statusContaPoupanca?: string | null
  identificadorTipoConta?: string | null
  statusCoberturaAutomatica?: string | null
  contaPoupancaFacil?: string | null
  dataUltimaAtualizacao?: string | null
  identificadorModalidadeConta?: string | null
  dataProximoPagamentoInss?: string | null
  dataVencimentoCartaoInss?: string | null
  statusCartaoInss?: string | null
  listaLancamentos?: ListaLancamentosExtrato | null
}

export interface ExtratoLancamentosFuturosBloco extends BradescoContasRetornoBase {
  quantidadeLancamentos?: string | null
  listaLancamentos?: ListaLancamentosExtrato | null
}

export interface LancamentoExtratoPeriodo {
  dataLancamento?: string
  numeroDocumento?: string
  valorLancamento?: string
  sinalLancamento?: string
  segundaLinhalLancamento?: string
  valorSaldoAposLancamento?: string
  sinalSaldo?: string
  identificacaoSubCodigo?: string | null
  tipoLancamento?: string
  codigoLancamento?: string
  descritivoLancamentoAbreviado?: string
  descritivoLancamentoCompleto?: string
  dataDebitoCpmf?: string
  valorCpmf?: string
}

export interface ExtratoPorPeriodoBloco extends BradescoContasRetornoBase {
  identificaoCliente?: string | null
  razaoConta?: string | null
  numeroConta?: string | null
  digitoConta?: string | null
  nomeCliente?: string | null
  quantidadeLancamentos?: string | null
  lstLancamentoMensal?: LancamentoExtratoPeriodo[] | null
}

/** Resposta GET extratos */
export interface ConsultaExtratoResponse {
  extratoUltimosLancamentos?: ExtratoUltimosLancamentosBloco | null
  extratoLancamentosFuturos?: ExtratoLancamentosFuturosBloco | null
  extratoPorPeriodo?: ExtratoPorPeriodoBloco | null
  codigoErro?: string
  descricao?: string
}
