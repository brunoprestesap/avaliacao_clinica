import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith("/login") || path.startsWith("/auth");
  const isNextAuthApi = path.startsWith("/api/auth");

  if (isNextAuthApi) {
    return NextResponse.next();
  }

  if (!token && !isAuthRoute) {
    // Rota raiz: deixar a página decidir (getSession), evitando loop pós-OAuth
    // onde o cookie pode ainda não estar disponível no Edge na primeira requisição.
    if (path === "/") {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
