"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, MapPin } from "lucide-react";
import Tippy from "@tippyjs/react";
import { toast } from "react-toastify";
import { trackEvent } from "@/lib/analytics";

/**
 * Componente que muestra indicadores de estado de conexión WiFi y ubicación.
 * Se actualiza en tiempo real cuando cambian los estados del navegador.
 *
 * @param {Object} props
 * @param {string} props.className - Clases adicionales para el contenedor
 */
export function StatusIndicators({ className = "" }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [locationStatus, setLocationStatus] = useState("unknown"); // granted | denied | prompt | unsupported | unknown
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  // Monitorear cambios de conexión en tiempo real
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  // Comprobar permiso de geolocalización (sin disparar el prompt)
  useEffect(() => {
    let mounted = true;
    const checkLocation = async () => {
      try {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          if (mounted) setLocationStatus("unsupported");
          return;
        }

        // Usar la API de Permissions para verificar el estado sin disparar el prompt
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const status = await navigator.permissions.query({
              name: "geolocation",
            });

            if (mounted) {
              // status.state puede ser: 'granted', 'denied', 'prompt'
              setLocationStatus(status.state || "prompt");

              try {
                trackEvent("location_permission_status", {
                  status: status.state || "prompt",
                });
              } catch {}
            }

            // Escuchar cambios de permisos
            status.onchange = () => {
              if (mounted) {
                setLocationStatus(status.state || "unknown");
                try {
                  trackEvent("location_permission_change", {
                    status: status.state || "unknown",
                  });
                } catch {}
              }
            };
          } catch {
            // Si la API de Permissions no está disponible o no soporta geolocation,
            // asumir que el estado es 'prompt' (sin solicitar)
            if (mounted) setLocationStatus("prompt");
          }
        } else {
          // Si no hay API de Permissions, asumir estado 'prompt'
          if (mounted) setLocationStatus("prompt");
        }
      } catch (error) {
        if (mounted) setLocationStatus("prompt");
      }
    };

    checkLocation();
    return () => {
      mounted = false;
    };
  }, []);

  // Solicitar permiso de ubicación bajo demanda (al tocar el ícono rojo)
  const requestLocationPermission = async () => {
    if (isCheckingLocation) return; // Evitar múltiples clicks

    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        toast.error("Tu dispositivo no soporta geolocalización.");
        return;
      }

      setIsCheckingLocation(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus("granted");
          setIsCheckingLocation(false);
          toast.success("Ubicación activada correctamente");
          try {
            trackEvent("location_permission_granted_manual", {
              accuracy: position.coords.accuracy,
            });
          } catch {}
        },
        (error) => {
          setIsCheckingLocation(false);

          if (error.code === 1) {
            // PERMISSION_DENIED
            setLocationStatus("denied");
            toast.error(
              "Permiso denegado. Ve a la configuración de tu navegador para activar la ubicación.",
              { autoClose: 5000 }
            );
          } else if (error.code === 2) {
            // POSITION_UNAVAILABLE
            setLocationStatus("unknown");
            toast.error("No se pudo determinar tu ubicación. Verifica tu GPS.");
          } else if (error.code === 3) {
            // TIMEOUT
            setLocationStatus("unknown");
            toast.error("Tiempo de espera agotado. Intenta nuevamente.");
          } else {
            setLocationStatus("unknown");
            toast.error("Error al obtener la ubicación.");
          }

          try {
            trackEvent("location_permission_error", {
              error_code: error.code,
              error_message: error.message,
            });
          } catch {}
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // Forzar nueva ubicación, no cache
        }
      );
    } catch (error) {
      setIsCheckingLocation(false);
      toast.error("Error inesperado al solicitar ubicación.");
    }
  };

  const isLocationOn = locationStatus === "granted";
  const isLocationPending = locationStatus === "prompt";

  return (
    <div
      className={`flex items-center gap-3 bg-primary-dark rounded-lg px-3 py-2 ${className}`}
    >
      {/* Conexión */}
      {isOnline ? (
        <Tippy
          content="Conexión activa"
          theme="light"
          placement="bottom"
          offset={[0, 8]}
        >
          <span className="inline-flex">
            <Wifi className="w-5 h-5 text-green-500" />
          </span>
        </Tippy>
      ) : (
        <Tippy
          content="Conexión desactivada"
          theme="light"
          placement="bottom"
          offset={[0, 8]}
        >
          <span className="inline-flex">
            <WifiOff className="w-5 h-5 text-red-500" />
          </span>
        </Tippy>
      )}
      {/* Ubicación */}
      <Tippy
        content={
          isCheckingLocation
            ? "Verificando ubicación..."
            : isLocationOn
            ? "Ubicación activada"
            : isLocationPending
            ? "Click para activar ubicación (opcional ahora, se solicitará al finalizar)"
            : "Click para activar ubicación"
        }
        theme="light"
        placement="bottom"
        offset={[0, 8]}
      >
        <span
          className={`inline-flex ${
            isLocationOn || isCheckingLocation
              ? ""
              : "cursor-pointer hover:scale-110 transition-transform"
          }`}
          onClick={() => {
            if (!isLocationOn && !isCheckingLocation) {
              requestLocationPermission();
            }
          }}
          role={isLocationOn || isCheckingLocation ? undefined : "button"}
          aria-label={
            isCheckingLocation
              ? "Verificando ubicación"
              : isLocationOn
              ? "Ubicación activada"
              : "Solicitar permiso de ubicación"
          }
        >
          <MapPin
            className={`w-5 h-5 ${
              isCheckingLocation
                ? "text-yellow-400 animate-pulse"
                : isLocationOn
                ? "text-green-500"
                : isLocationPending
                ? "text-yellow-500"
                : "text-red-500"
            }`}
          />
        </span>
      </Tippy>
    </div>
  );
}
