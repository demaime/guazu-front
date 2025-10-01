"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Botón flotante para actualizar/recargar la página
 * Se oculta automáticamente en la página de responder encuesta
 */
export function RefreshButton() {
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ocultar en página de responder
  if (pathname === "/dashboard/encuestas/responder") {
    return null;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);

    // Recargar la página
    window.location.reload();

    // El estado se limpiará automáticamente al recargar
    // pero si por alguna razón no recarga, limpiarlo después de 2s
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        title="Actualizar página"
        aria-label="Actualizar página"
      >
        <RefreshCw
          className={`w-6 h-6 ${isRefreshing ? "animate-spin" : ""}`}
        />
      </motion.button>
    </AnimatePresence>
  );
}
