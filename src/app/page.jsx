"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { SplashScreen } from "@/components/SplashScreen";

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setIsCheckingAuth(true);

    // Delay mínimo para transición suave
    setTimeout(() => {
      try {
        if (authService.isAuthenticated()) {
          router.replace("/dashboard/encuestas");
        } else {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        router.replace("/login");
      } finally {
        setIsCheckingAuth(false);
      }
    }, 300);
  };

  // Mostrar splash screen al inicio
  if (showSplash) {
    return (
      <SplashScreen
        isVisible={true}
        onComplete={handleSplashComplete}
        duration={3000}
      />
    );
  }

  // Fallback mientras se verifica autenticación (rara vez se ve)
  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 bg-[var(--primary)] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="loader mb-4" style={{ "--size": "40px" }} />
          <p className="text-lg">Iniciando...</p>
        </div>
      </div>
    );
  }

  return null;
}
