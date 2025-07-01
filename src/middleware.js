import { NextResponse } from "next/server";

// Definimos las rutas protegidas y sus roles permitidos
const protectedRoutes = {
  "/dashboard/usuarios": ["ROLE_ADMIN", "SUPERVISOR"],
  "/dashboard/encuestas": ["ROLE_ADMIN", "SUPERVISOR", "POLLSTER"],
  "/dashboard/encuestas/nueva": ["ROLE_ADMIN", "SUPERVISOR"],
  "/dashboard/configuracion": ["ROLE_ADMIN", "SUPERVISOR", "POLLSTER"],
};

export function middleware(request) {
  const token = request.cookies.get("token");
  const user = request.cookies.get("user")
    ? JSON.parse(request.cookies.get("user").value)
    : null;

  // Si no hay token, redirigir a /login
  if (!token && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si hay token y estamos en login, redirigir según el rol
  if (token && request.nextUrl.pathname === "/login") {
    const redirectPath =
      user?.role === "POLLSTER" ? "/dashboard/encuestas" : "/dashboard";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Redirigir pollsters de /dashboard a /dashboard/encuestas
  if (user?.role === "POLLSTER" && request.nextUrl.pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/dashboard/encuestas", request.url));
  }

  // Verificar permisos para rutas protegidas
  if (user && request.nextUrl.pathname.startsWith("/dashboard/")) {
    const path = request.nextUrl.pathname;
    const allowedRoles = protectedRoutes[path];

    // Si la ruta está protegida y el usuario no tiene el rol adecuado
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirigir según el rol si no tiene permisos
      const redirectPath =
        user.role === "POLLSTER" ? "/dashboard/encuestas" : "/dashboard";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard", "/login"],
};
