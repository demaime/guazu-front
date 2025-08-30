"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { Loader } from "@/components/ui/Loader";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";
import { motion, AnimatePresence } from "framer-motion";

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
      setError(err.message);
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
      className="login-page min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
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
        className="max-w-xl w-full space-y-8 bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="flex justify-center w-full"
        >
          <div className="w-[350px] h-[120px] relative mx-auto">
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
          className="mt-12 space-y-8"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
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

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="flex items-center justify-end"
          >
            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-white/80 hover:text-white"
              >
                ¿Olvidó su contraseña?
              </Link>
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-white bg-white/60 p-3 rounded-md text-sm text-center"
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
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.3 }}
          className="text-center"
        >
          <Link
            href="/register"
            className="text-sm text-white/80 hover:text-white"
          >
            ¿No tiene una cuenta? Regístrese
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
