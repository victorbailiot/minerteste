/**
 * Utilitário para copiar texto para a área de transferência
 * com fallback para navegadores antigos ou contextos sem suporte
 */

/**
 * Copia texto para a área de transferência
 * @param text Texto a ser copiado
 * @returns Promise<boolean> - true se copiou com sucesso
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Tenta usar a API moderna do Clipboard
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback para navegadores antigos
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    return successful
  } catch (err) {
    console.error('Erro ao copiar para área de transferência:', err)
    return false
  }
}

/**
 * Copia texto com feedback visual ao usuário
 * @param text Texto a ser copiado
 * @param successMessage Mensagem de sucesso (opcional)
 * @param errorMessage Mensagem de erro (opcional)
 */
export const copyWithFeedback = async (
  text: string,
  successMessage?: string,
  errorMessage?: string
): Promise<void> => {
  const success = await copyToClipboard(text)
  
  if (success) {
    if (successMessage) {
      alert(successMessage)
    }
  } else {
    const msg = errorMessage || `Não foi possível copiar automaticamente. Por favor, copie manualmente:\n\n${text}`
    alert(msg)
  }
}

/**
 * Verifica se o navegador suporta a API Clipboard
 */
export const isClipboardSupported = (): boolean => {
  return !!(navigator?.clipboard?.writeText || document?.execCommand)
}

/**
 * Compartilha conteúdo usando a Web Share API ou copia para clipboard como fallback
 * @param data Dados para compartilhar
 * @returns Promise<boolean> - true se compartilhou/copiou com sucesso
 */
export const shareOrCopy = async (data: {
  title?: string
  text: string
  url?: string
}): Promise<boolean> => {
  try {
    // Tenta usar a Web Share API
    if (navigator?.share) {
      await navigator.share(data)
      return true
    }

    // Fallback: copia para clipboard
    const success = await copyToClipboard(data.text)
    if (success) {
      alert('Conteúdo copiado para a área de transferência!')
      return true
    }

    return false
  } catch (err) {
    console.error('Erro ao compartilhar:', err)
    // Se cancelou o share, não é erro
    if ((err as Error).name === 'AbortError') {
      return false
    }
    
    // Tenta copiar como último recurso
    return await copyToClipboard(data.text)
  }
}

