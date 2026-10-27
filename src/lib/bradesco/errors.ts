/**
 * Classe de erro personalizada para a integração Bradesco Pix
 */

import { BradescoApiErrorPayload } from './types'

export class BradescoPixError extends Error {
  public readonly httpStatus: number
  public readonly code?: string
  public readonly details?: BradescoApiErrorPayload

  constructor(
    message: string,
    httpStatus: number,
    code?: string,
    details?: BradescoApiErrorPayload
  ) {
    super(message)
    this.name = 'BradescoPixError'
    this.httpStatus = httpStatus
    this.code = code
    this.details = details
  }

  static fromHttpError(
    httpStatus: number,
    rawPayload: BradescoApiErrorPayload | string
  ): BradescoPixError {
    if (typeof rawPayload === 'string') {
      let msg = `[BradescoLib] Erro HTTP ${httpStatus}: ${rawPayload}`
      if (
        httpStatus === 403 &&
        /MessageBlocked|message blocked/i.test(rawPayload)
      ) {
        msg +=
          ' | Gateway Bradesco bloqueou a chamada. Verifique no portal se o app tem acesso à API de saldo/extrato; se usar certificado mTLS diferente do Pix, defina BRADESCO_*_CONTAS_CERT_PATH e BRADESCO_*_CONTAS_KEY_PATH; confira BRADESCO_CONTAS_OAUTH_SCOPE apenas se a documentação do app exigir.'
      }
      return new BradescoPixError(msg, httpStatus)
    }

    const message =
      rawPayload.mensagem ||
      rawPayload.descricao ||
      rawPayload.codigoErro ||
      `[BradescoLib] Erro HTTP ${httpStatus}`

    return new BradescoPixError(
      message,
      httpStatus,
      rawPayload.codigo ?? rawPayload.codigoErro,
      rawPayload
    )
  }
}
