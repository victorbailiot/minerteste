import { NextRequest } from 'next/server'

// Esta rota retorna uma página HTML mínima, isolada do app, para evitar conflitos
// com babel-polyfill ao carregar o script tokenizecard.js do Pagar.me. A página
// recebe os dados do cartão via postMessage, executa a tokenização e devolve o
// token ao opener (janela mãe) também via postMessage.

export async function GET(_req: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_PAGARME_KEY_PUBLIC || ''

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pagarme Tokenize</title>
    <style>
      html, body { margin: 0; padding: 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <div id="status" style="font-size:14px;color:#111">Inicializando tokenização...</div>
    <form data-pagarmecheckout-form>
      <input data-pagarmecheckout-element="number" class="hidden" />
      <input data-pagarmecheckout-element="holder_name" class="hidden" />
      <input data-pagarmecheckout-element="exp_month" class="hidden" />
      <input data-pagarmecheckout-element="exp_year" class="hidden" />
      <input data-pagarmecheckout-element="cvv" class="hidden" />
    </form>

    <script>window._babelPolyfill = true;</script>
    <script src="https://checkout.pagar.me/v1/tokenizecard.js" data-pagarmecheckout-app-id="${publicKey}"></script>
    <script>
      (function(){
        function ready(){
          var status = document.getElementById('status')
          function setStatus(msg){ if(status) status.textContent = msg }
          setStatus('Aguardando dados do cartão...')

          // Sinaliza várias vezes que a página está pronta para evitar race conditions
          var notifyReadyCount = 0
          var notifyTimer = setInterval(function(){
            notifyReadyCount++
            try { window.opener && window.opener.postMessage({ type: 'TOKEN_PAGE_READY' }, '*') } catch(_) {}
            if (notifyReadyCount > 20) clearInterval(notifyTimer)
          }, 150)

          window.addEventListener('message', function(ev){
            try {
              var data = ev.data || {}
              if (data && data.type === 'FILL_AND_TOKENIZE' && data.card) {
                setStatus('Recebendo dados e iniciando tokenização...')
                var c = data.card
                document.querySelector('[data-pagarmecheckout-element="number"]').value = c.number || ''
                document.querySelector('[data-pagarmecheckout-element="holder_name"]').value = c.holderName || ''
                document.querySelector('[data-pagarmecheckout-element="exp_month"]').value = c.expMonth || ''
                document.querySelector('[data-pagarmecheckout-element="exp_year"]').value = c.expYear || ''
                document.querySelector('[data-pagarmecheckout-element="cvv"]').value = c.cvv || ''

                if (window.PagarmeCheckout && typeof window.PagarmeCheckout.init === 'function') {
                  setStatus('Tokenizando...')
                  window.PagarmeCheckout.init(function(res){
                    try {
                      window.opener && window.opener.postMessage({ type: 'TOKEN_OK', token: res && res.pagarmetoken }, '*')
                    } catch(_) {}
                    setStatus('Concluído. Você pode fechar esta janela.')
                    window.close()
                  }, function(err){
                    try {
                      window.opener && window.opener.postMessage({ type: 'TOKEN_ERROR', error: err }, '*')
                    } catch(_) {}
                    setStatus('Erro ao tokenizar. Fechando...')
                    window.close()
                  })
                } else {
                  try {
                    window.opener && window.opener.postMessage({ type: 'TOKEN_ERROR', error: { message: 'PagarmeCheckout indisponível' } }, '*')
                  } catch(_) {}
                  setStatus('PagarmeCheckout indisponível')
                  window.close()
                }
              }
            } catch(e) {
              try { window.opener && window.opener.postMessage({ type: 'TOKEN_ERROR', error: { message: e && e.message || 'Erro desconhecido' } }, '*') } catch(_) {}
              setStatus('Erro inesperado')
              window.close()
            }
          })
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') ready()
        else document.addEventListener('DOMContentLoaded', ready)
      })()
    </script>
  </body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}


