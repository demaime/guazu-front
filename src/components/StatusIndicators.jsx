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

  // Comprobar permiso de geolocalización (y reaccionar a cambios)
  useEffect(() => {
    let mounted = true;
    const checkLocation = async () => {
      try {
        if (typeof navigator === "undefined") return;
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({
            name: "geolocation",
          });
          if (mounted) setLocationStatus(status.state || "unknown");
          try {
            trackEvent("location_permission_status", {
              status: status.state || "unknown",
            });
          } catch {}
          status.onchange = () => {
            if (mounted) setLocationStatus(status.state || "unknown");
            try {
              trackEvent("location_permission_status", {
                status: status.state || "unknown",
              });
            } catch {}
          };
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => {
              if (mounted) setLocationStatus("granted");
              try {
                trackEvent("location_permission_status", { status: "granted" });
              } catch {}
            },
            () => {
              if (mounted) setLocationStatus("denied");
              try {
                trackEvent("location_permission_status", { status: "denied" });
              } catch {}
            },
            { maximumAge: 0, timeout: 800 }
          );
        } else {
          if (mounted) setLocationStatus("unsupported");
          try {
            trackEvent("location_permission_status", { status: "unsupported" });
          } catch {}
        }
      } catch {
        if (mounted) setLocationStatus("unknown");
        try {
          trackEvent("location_permission_status", { status: "unknown" });
        } catch {}
      }
    };
    checkLocation();
    return () => {
      mounted = false;
    };
  }, []);

  // Solicitar permiso de ubicación bajo demanda (al tocar el ícono rojo)
  const requestLocationPermission = () => {
    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        () => setLocationStatus("granted"),
        () => {
          setLocationStatus("denied");
          toast.error("No se pudo obtener la ubicación.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } catch {}
  };

  const isLocationOn = locationStatus === "granted";

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
        content={isLocationOn ? "Ubicación activada" : "Ubicación desactivada"}
        theme="light"
        placement="bottom"
        offset={[0, 8]}
      >
        <span
          className={`inline-flex ${isLocationOn ? "" : "cursor-pointer"}`}
          onClick={() => {
            if (!isLocationOn) requestLocationPermission();
          }}
          role={isLocationOn ? undefined : "button"}
          aria-label={
            isLocationOn
              ? "Ubicación activada"
              : "Solicitar permiso de ubicación"
          }
        >
          <MapPin
            className={`w-5 h-5 ${
              isLocationOn ? "text-green-500" : "text-red-500"
            }`}
          />
        </span>
      </Tippy>
    </div>
  );
}
