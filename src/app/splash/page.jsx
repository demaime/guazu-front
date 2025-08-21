"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/SplashScreen";

/**
 * Página de splash como fallback para navegadores que no soportan
 * splash screens nativos de PWA
 */
export default function SplashPage() {
  const router = useRouter();

  const handleSplashComplete = () => {
    // Redirigir a la página principal después del splash
    router.replace("/");
  };

  return (
    <SplashScreen
      isVisible={true}
      onComplete={handleSplashComplete}
      duration={3000}
    />
  );
}
