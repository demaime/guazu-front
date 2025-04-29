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
  let user = null; // Initialize user as null

  try {
    // Attempt to parse the user cookie only if it exists
    const userCookie = request.cookies.get("user");
    if (userCookie?.value) {
      user = JSON.parse(userCookie.value);
    }
  } catch (error) {
    console.error("Failed to parse user cookie:", error);
    // Option 1: Treat as logged out (clear potentially corrupted cookies and redirect)
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    response.cookies.delete("user");
    return response;
    // Option 2: Log the error and proceed (might lead to unexpected behavior if user data is crucial later)
    // user = null; // Keep user as null
  }

  // Si no hay token y NO es la página de login, redirigir a /login
  if (!token && request.nextUrl.pathname !== "/login") {
    // Ensure any potentially invalid user cookie is cleared on redirect
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("user"); // Clear user cookie if token is missing
    return response;
  }

  // Si hay token y estamos en login, redirigir a dashboard
  if (token && request.nextUrl.pathname === "/login") {
    // If user parsing failed earlier, user might be null here.
    // Redirecting to dashboard might still be okay,
    // but the dashboard page should also handle the case where the user cookie is invalid.
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Verificar permisos para rutas protegidas only if user data is valid
  if (user && request.nextUrl.pathname.startsWith("/dashboard/")) {
    const path = request.nextUrl.pathname;
    const routeConfig = protectedRoutes[path];

    // If the route is protected and the user object exists
    if (routeConfig) {
      // Check if the user's role is included in the allowed roles for the route
      if (!user.role || !routeConfig.includes(user.role)) {
        // Redirect to dashboard if the role is missing or not allowed
        console.warn(
          `User role "${user.role}" not authorized for path: ${path}. Redirecting to /dashboard.`
        );
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    // If the route is not specifically listed in protectedRoutes, allow access
    // (assuming default access to /dashboard and its sub-routes unless specified)
  } else if (!user && request.nextUrl.pathname.startsWith("/dashboard/")) {
    // If there's no valid user object but trying to access dashboard/*
    // This case might happen if the user cookie was invalid and cleared
    console.warn(
      `No valid user data found for accessing ${request.nextUrl.pathname}. Redirecting to /login.`
    );
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token"); // Also clear token just in case
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Adjusted matcher to ensure all dashboard routes are covered, including the base '/dashboard'
  matcher: ["/dashboard/:path*", "/login"],
};
