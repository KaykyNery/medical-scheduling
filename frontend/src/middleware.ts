import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const { nextUrl } = req;

  const isAdminRoute = nextUrl.pathname.startsWith("/agenda") || 
                       nextUrl.pathname.startsWith("/pacientes") || 
                       nextUrl.pathname.startsWith("/relatorios");

  const isPatientRoute = nextUrl.pathname.startsWith("/meu-agendamento") || 
                         nextUrl.pathname.startsWith("/meus-agendamentos");

  // 1. Redirect if not logged in
  if ((isAdminRoute || isPatientRoute) && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return Response.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  // 2. Redirect if role mismatch
  if (isAdminRoute && isLoggedIn) {
    if (role !== "ADMIN" && role !== "RECEPTIONIST" && role !== "PROFESSIONAL") {
      return Response.redirect(new URL("/sem-permissao", nextUrl));
    }
  }

  if (isPatientRoute && isLoggedIn) {
    if (role !== "PATIENT") {
      return Response.redirect(new URL("/sem-permissao", nextUrl));
    }
  }
});

export const config = {
  matcher: [
    "/agenda/:path*",
    "/pacientes/:path*",
    "/relatorios/:path*",
    "/meu-agendamento/:path*",
    "/meus-agendamentos/:path*"
  ],
};
