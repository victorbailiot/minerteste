import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { setupBigIntSerialization } from '@/lib/utils'
import ToasterProvider from '@/components/ToasterProvider'
import SessionProvider from '@/components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

// Configurar serialização BigInt globalmente
setupBigIntSerialization()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <title>MinerStone - Multiplicando valor, conectando pessoas.</title>
        <meta name="description" content="MinerStone - Plataforma de mineração sustentável e inovadora. Transformando o futuro através da mineração de cobre com tecnologia de ponta." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MinerStone" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />

        {/* Meta tags para SEO */}
        <meta name="theme-color" content="#000000" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="MinerStone - Multiplicando valor, conectando pessoas." />
        <meta property="og:description" content="Plataforma de mineração sustentável e inovadora. Transformando o futuro através da mineração de cobre com tecnologia de ponta." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
      </head>
      <body className={inter.className}>
        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-F7LBZFEDRD"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-F7LBZFEDRD');
            `,
          }}
        />
        
        <SessionProvider>
          {children}
          <ToasterProvider />
        </SessionProvider>
      </body>
    </html>
  )
}
