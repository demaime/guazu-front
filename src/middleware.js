import { NextResponse } from "next/server";

// Definimos las rutas protegidas y sus roles permitidos
const protectedRoutes = {
  "/dashboard/usuarios": ["ROLE_ADMIN"],
  "/dashboard/encuestas": ["ROLE_ADMIN", "SUPERVISOR", "POLLSTER"],
  "/dashboard/encuestas/nueva": ["ROLE_ADMIN", "SUPERVISOR"],
  "/dashboard/encuestadores": ["ROLE_ADMIN", "SUPERVISOR"],
  "/dashboard/configuracion": ["ROLE_ADMIN", "SUPERVISOR", "POLLSTER"],
};

// Función helper para parsear la cookie user de forma segura
function parseUserCookie(userCookie) {
  if (!userCookie) return null;

  try {
    // Try to decode the cookie value first (in case it's URL encoded)
    const decodedValue = decodeURIComponent(userCookie.value);
    return JSON.parse(decodedValue);
  } catch (error) {
    console.error("Error parsing user cookie:", error);
    // Si hay error parsing el JSON, retornamos un objeto especial para indicar corrupción
    return { corrupted: true };
  }
}

export function middleware(request) {
  const token = request.cookies.get("token");
  const user = parseUserCookie(request.cookies.get("user"));
  const pathname = request.nextUrl.pathname;
  const method = request.method || "GET";

  // Si las cookies están corruptas, limpiar y redirigir a login
  if (user?.corrupted) {
    const response = NextResponse.redirect(
      new URL("/login?clearCookies=true", request.url)
    );
    // Clear the corrupted cookies
    response.cookies.delete("token");
    response.cookies.delete("user");
    return response;
  }

  // Si no hay token, permitir app-shell offline para rutas estables del encuestador
  // Dejar que el cliente decida (localStorage) y evitar redirección del lado servidor
  if (!token) {
    const isOfflineStableRoute =
      method === "GET" &&
      (pathname === "/dashboard/encuestas" ||
        pathname === "/dashboard/encuestas/responder" ||
        pathname === "/dashboard");
    if (!isOfflineStableRoute && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Si hay token y estamos en login, redirigir según el rol
  if (token && request.nextUrl.pathname === "/login") {
    const redirectPath =
      user?.role === "POLLSTER" ? "/dashboard/encuestas" : "/dashboard";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Redirigir pollsters de /dashboard a /dashboard/encuestas
  if (user?.role === "POLLSTER" && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/dashboard/encuestas", request.url));
  }

  // Verificar permisos para rutas protegidas
  if (user && pathname.startsWith("/dashboard/")) {
    const path = pathname;
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
