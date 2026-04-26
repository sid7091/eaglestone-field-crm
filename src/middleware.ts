import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  // Allow API auth routes
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Redirect to login if no token and not on login page
  if (!token && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to dashboard if already logged in and on login page
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/field-dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|sw\\.js|manifest\\.json|offline).*)",
  ],
};
