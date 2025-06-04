"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { motion } from "framer-motion";
import { LoaderWrapper } from "@/components/ui/LoaderWrapper";

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check if we're offline first
        if (!navigator.onLine) {
          setIsOffline(true);
          // If offline, try to get cached user data
          const cachedUser = authService.getUser();
          const cachedToken = authService.getToken();

          if (cachedUser && cachedToken) {
            // We have cached authentication data, go to dashboard
            console.log(
              "Offline mode: Using cached authentication, redirecting to dashboard"
            );
            router.replace("/dashboard/encuestas");
          } else {
            // No cached auth, go to login
            console.log(
              "Offline mode: No cached authentication, redirecting to login"
            );
            router.replace("/login");
          }
        } else {
          // Online - normal authentication check
          if (authService.isAuthenticated()) {
            router.replace("/dashboard");
          } else {
            router.replace("/login");
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);

        // If there's an error and we might be offline, check for cached data
        const cachedUser = authService.getUser();
        const cachedToken = authService.getToken();

        if (cachedUser && cachedToken) {
          console.log(
            "Auth error but cached data exists, redirecting to dashboard/encuestas"
          );
          router.replace("/dashboard/encuestas");
        } else {
          console.log("Auth error and no cached data, redirecting to login");
          router.replace("/login");
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    setTimeout(checkAuth, 100);
  }, [router]);

  if (isCheckingAuth) {
    return (
      <LoaderWrapper size="xl" fullScreen>
        {isOffline && (
          <div className="text-[var(--text-primary)] text-center mt-4">
            <p className="text-[var(--text-secondary)]">
              Modo offline - Cargando datos locales...
            </p>
          </div>
        )}
      </LoaderWrapper>
    );
  }

  return <LoaderWrapper size="xl" fullScreen />;
}
