import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin')
    const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard')

    // Se está tentando acessar página de auth mas já está logado
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Se está tentando acessar dashboard mas não está logado
    if (isDashboardPage && !isAuth) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Permitir acesso a /admin para qualquer usuário autenticado
    // A verificação de permissões específicas (como dashboard.admin) será feita
    // nas próprias páginas usando PermissionGate e nas APIs usando hasPermission()
    // Isso permite que usuários com permissões específicas (sem roles de admin)
    // possam acessar o admin, enquanto a UI e APIs controlam o que podem ver/fazer
    // if (isAdminPage && isAuth) {
    //   // Verificação removida - deixar para as páginas e APIs verificarem permissões
    // }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*'
  ]
} 