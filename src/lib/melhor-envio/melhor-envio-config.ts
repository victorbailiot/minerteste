/**
 * Configuração da API Melhor Envio
 * Utiliza variáveis de ambiente MELHOR_ENVIO_TOKEN e MELHOR_ENVIO_URL
 */

export const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN || ''
export const MELHOR_ENVIO_URL = process.env.MELHOR_ENVIO_URL || 'https://sandbox.melhorenvio.com.br/api/v2/me'

export const MELHOR_ENVIO_CALCULATE_ENDPOINT = '/shipment/calculate'
