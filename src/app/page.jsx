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

    // Verificar autenticación inmediatamente sin pantalla intermedia
    try {
      if (authService.isAuthenticated()) {
        router.replace("/dashboard/encuestas");
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      router.replace("/login");
    }
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

  // El componente se desmonta inmediatamente después del splash
  return null;
}
