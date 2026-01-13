"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { motion, AnimatePresence } from "framer-motion";
import InstallPWA from "@/components/InstallPWA";
import { setUserId, setUserProperties, trackEvent } from "@/lib/analytics";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  // (Scroll se administra vía CSS en .login-page para no afectar otras pantallas)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we need to clear corrupted cookies
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("clearCookies") === "true") {
          authService.clearCorruptedCookies();
          return; // This will redirect to login, so we don't need to continue
        }

        const isAuth = await authService.isAuthenticated();
        if (isAuth) {
          setIsRedirecting(true);
          const user = authService.getUser();
          // Redirigir según el rol
          const redirectPath =
            user?.role === "POLLSTER" ? "/dashboard/encuestas" : "/dashboard";
          router.push(redirectPath);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        // If there's an error checking auth, it might be due to corrupted cookies
        // Try clearing them
        try {
          authService.clearCorruptedCookies();
        } catch (clearError) {
          console.error("Error clearing corrupted cookies:", clearError);
        }
      } finally {
        setIsPageLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Cerrar menú de ayuda al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHelpMenu && !event.target.closest(".help-menu-container")) {
        setShowHelpMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHelpMenu]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validación mínima: ambos campos completos
    if (!formData.email || !formData.password) {
      setError("Complete ambos campos");
      return;
    }

    setIsLoading(true);
    setShowOverlay(true);

    try {
      const loginResult = await authService.login(
        formData.email,
        formData.password,
        true
      );

      if (loginResult) {
        const user = authService.getUser();
        try {
          if (user?._id) setUserId(user._id);
          setUserProperties({ role: user?.role || "UNKNOWN" });
          trackEvent("login_success", { role: user?.role || "UNKNOWN" });
        } catch {}
        // Redirigir según el rol
        const redirectPath =
          user?.role === "POLLSTER" ? "/dashboard/encuestas" : "/dashboard";
        router.push(redirectPath);
        setIsFadingOut(true);
      } else {
        setError("Error de autenticación");
        setShowOverlay(false);
        setIsFadingOut(false);
      }
    } catch (err) {
      // Traducir error si es necesario
      let errorMsg =
        "No se pudo conectar con el servidor. Por favor, verifica tu conexión e intenta nuevamente.";

      if (
        err.message &&
        !err.message.includes("Failed to fetch") &&
        !err.message.includes("Network request failed") &&
        !err.message.includes("fetch")
      ) {
        errorMsg = err.message; // Usar mensaje si ya está en español
      }

      setError(errorMsg);
      setShowOverlay(false);
      setIsFadingOut(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  if (isPageLoading) {
    return <LoaderWrapper size="xl" fullScreen></LoaderWrapper>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        setShowOverlay(false);
        setIsFadingOut(false);
      }}
      className="login-page min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8"
    >
      {/* Overlay de inicio de sesión fullscreen */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="login-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ backgroundColor: "var(--primary)" }}
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative w-[140px] h-[140px]"
              >
                <Image
                  src="/logo-solo.png"
                  alt="Guazú"
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>
              <div className="loader-caption text-white text-base font-medium">
                <span>Iniciando sesión...</span>
                <div className="loading-underline mt-2" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="max-w-md w-full space-y-6 bg-white/20 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="flex justify-center w-full"
        >
          <div className="w-[280px] sm:w-[320px] h-[100px] sm:h-[110px] relative mx-auto">
            <Image
              src="/login-logo.png"
              alt="Guazú - Argentina - Santa Fe - Encuestas"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>

        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 sm:mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-3 sm:space-y-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white uppercase"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese su email"
                value={formData.email}
                onChange={handleChange}
              />
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white uppercase"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese su contraseña"
                value={formData.password}
                onChange={handleChange}
              />
            </motion.div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-[var(--error-text)] bg-[var(--error-bg)] p-3 rounded-md text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.3 }}
          >
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader size="sm" className="mr-2" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </motion.div>

          {/* Botón de ayuda */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="text-center relative help-menu-container"
          >
            <button
              type="button"
              onClick={() => setShowHelpMenu(!showHelpMenu)}
              className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              ¿Problemas para iniciar sesión?
            </button>

            <AnimatePresence>
              {showHelpMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden z-10"
                >
                  <div className="py-1">
                    <Link
                      href="/forgot-password"
                      className="block px-4 py-2 text-xs font-medium text-center text-gray-700 hover:bg-[#3f51b5] hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      No recuerdo mi contraseña
                    </Link>
                    <div className="mx-4 border-t border-gray-100"></div>
                    <Link
                      href="/resend-activation"
                      className="block px-4 py-2 text-xs font-medium text-center text-gray-700 hover:bg-[#3f51b5] hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      No recibí el email de activación
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.3 }}
          className="text-center"
        >
          <Link
            href="/register"
            className="text-sm text-white/80 hover:text-white"
          >
            ¿No tiene una cuenta?{" "}
            <span className="font-semibold text-[var(--primary-dark)]">
              {" "}
              Regístrese
            </span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Componente de instalación PWA - solo visible cuando no hay overlay */}
      {!showOverlay && <InstallPWA />}
    </motion.div>
  );
}
