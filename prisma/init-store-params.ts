import { ensureStoreParameters } from '../src/lib/services/storeMLMService'

async function initStoreParams() {
  console.log('🔧 Inicializando parâmetros da loja...')
  
  try {
    await ensureStoreParameters()
    console.log('✅ Parâmetros da loja configurados com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao configurar parâmetros:', error)
    process.exit(1)
  }
}

initStoreParams()
