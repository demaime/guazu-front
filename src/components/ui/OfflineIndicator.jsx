"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePouchDB } from "@/hooks/usePouchDB";
import { toast } from "react-toastify";

/**
 * Componente que muestra el estado de conexión y datos offline
 */
export const OfflineIndicator = () => {
  const { isOnline, isOffline } = useNetworkStatus();
  const {
    offlineSurveys,
    pendingResponses,
    getPendingResponsesCount,
    loadOfflineData,
    isLoading,
  } = usePouchDB();

  const [showDetails, setShowDetails] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, success, error

  const pendingCount = getPendingResponsesCount();

  // Escuchar mensajes del service worker y eventos de descarga
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === "SURVEYS_SYNCED") {
        setSyncStatus("success");
        toast.success(`${event.data.count} respuestas sincronizadas`);
        // Actualizar datos inmediatamente
        await loadOfflineData();
        setTimeout(() => setSyncStatus("idle"), 3000);
      }
    };

    const handleOfflineDownload = async () => {
      // Actualizar datos cuando se descarga una encuesta
      await loadOfflineData();
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    // Escuchar eventos personalizados de descarga offline
    window.addEventListener("offlineDownloadCompleted", handleOfflineDownload);

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
      window.removeEventListener(
        "offlineDownloadCompleted",
        handleOfflineDownload
      );
    };
  }, [loadOfflineData]);

  // Forzar sincronización
  const handleForceSync = async () => {
    if (!isOnline) {
      toast.warn("No hay conexión a internet");
      return;
    }

    setSyncStatus("syncing");

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          setSyncStatus("success");
          toast.success("Sincronización completada");
        } else {
          setSyncStatus("error");
          toast.error("Error en sincronización: " + event.data.error);
        }
        setTimeout(() => setSyncStatus("idle"), 3000);
      };

      navigator.serviceWorker.controller.postMessage({ type: "FORCE_SYNC" }, [
        channel.port2,
      ]);
    }
  };

  // Función eliminada: handleClearOfflineData ya no es necesaria

  const getStatusIcon = () => {
    if (syncStatus === "syncing")
      return <RotateCcw className="w-4 h-4 animate-spin" />;
    if (syncStatus === "success")
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (syncStatus === "error")
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (isOffline) return <WifiOff className="w-4 h-4 text-red-500" />;
    return <Wifi className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (syncStatus === "syncing") return "Sincronizando...";
    if (syncStatus === "success") return "Sincronizado";
    if (syncStatus === "error") return "Error de sincronización";
    if (isOffline) return "Sin conexión";
    return "En línea";
  };

  const getStatusColor = () => {
    if (syncStatus === "syncing") return "text-blue-500";
    if (syncStatus === "success") return "text-green-500";
    if (syncStatus === "error") return "text-red-500";
    if (isOffline) return "text-red-500";
    return "text-green-500";
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <motion.div
        className="rounded-lg border transition-colors"
        style={{
          backgroundColor: "var(--card-background)",
          borderColor: "var(--card-border)",
          boxShadow:
            "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Indicador principal */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 p-3 rounded-lg transition-colors"
          style={{
            "--hover-bg": "var(--hover-bg)",
          }}
          onMouseEnter={(e) =>
            (e.target.style.backgroundColor = "var(--hover-bg)")
          }
          onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
        >
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>

          {/* Badges de contadores */}
          <div className="flex gap-1">
            {offlineSurveys.length > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                {offlineSurveys.length} offline
              </span>
            )}
            {pendingCount > 0 && (
              <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs px-2 py-1 rounded-full">
                {pendingCount} pendientes
              </span>
            )}
          </div>
        </button>

        {/* Panel de detalles */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              className="border-t p-3 min-w-[300px]"
              style={{
                borderTopColor: "var(--card-border)",
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-3">
                {/* Estado de conexión */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Estado de conexión:
                  </span>
                  <span className={`text-sm font-medium ${getStatusColor()}`}>
                    {isOnline ? "Conectado" : "Desconectado"}
                  </span>
                </div>

                {/* Encuestas offline */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Encuestas offline:
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {offlineSurveys.length}
                  </span>
                </div>

                {/* Respuestas pendientes */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Respuestas pendientes:
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {pendingCount}
                  </span>
                </div>

                {/* Acciones */}
                <div
                  className="flex gap-2 pt-2 border-t"
                  style={{ borderTopColor: "var(--card-border)" }}
                >
                  <button
                    onClick={handleForceSync}
                    disabled={
                      !isOnline || syncStatus === "syncing" || isLoading
                    }
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw
                      className={`w-3 h-3 ${
                        syncStatus === "syncing" ? "animate-spin" : ""
                      }`}
                    />
                    Sincronizar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

/**
 * Botón para descargar encuesta para uso offline
 */
export const OfflineDownloadButton = ({
  surveyId,
  surveyData,
  size = "sm",
  variant = "outline",
}) => {
  const {
    downloadSurveyForOffline,
    isSurveyAvailableOffline,
    removeSurveyOffline,
    isLoading,
  } = usePouchDB();
  const [isAvailable, setIsAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = await isSurveyAvailableOffline(surveyId);
        setIsAvailable(available);
      } catch (err) {
        console.error("Error checking survey availability:", err);
      } finally {
        setChecking(false);
      }
    };

    if (surveyId) {
      checkAvailability();
    }
  }, [surveyId, isSurveyAvailableOffline]);

  const handleToggleOffline = async () => {
    try {
      if (isAvailable) {
        await removeSurveyOffline(surveyId);
        setIsAvailable(false);
        // Disparar evento para actualizar OfflineIndicator
        window.dispatchEvent(new CustomEvent("offlineDownloadCompleted"));
      } else {
        await downloadSurveyForOffline(surveyId, surveyData);
        setIsAvailable(true);
        // Disparar evento para actualizar OfflineIndicator
        window.dispatchEvent(new CustomEvent("offlineDownloadCompleted"));
      }
    } catch (err) {
      console.error("Error toggling offline availability:", err);
    }
  };

  if (checking) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantClasses = {
    outline: isAvailable
      ? "border border-blue-500 text-white bg-blue-500 hover:bg-blue-600"
      : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700",
    filled: isAvailable
      ? "bg-blue-500 text-white hover:bg-blue-600"
      : "bg-blue-500 text-white hover:bg-blue-600",
  };

  return (
    <button
      onClick={handleToggleOffline}
      disabled={isLoading}
      className={`
        flex items-center gap-2 rounded-md transition-colors
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
      title={isAvailable ? "Eliminar de offline" : "Descargar para offline"}
    >
      {isLoading ? (
        <RotateCcw className="w-4 h-4 animate-spin" />
      ) : isAvailable ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span>{isAvailable ? "Disponible offline" : "Descargar offline"}</span>
    </button>
  );
};
