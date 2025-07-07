"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";

/**
 * Componente para inicializar y gestionar el Service Worker
 * Se debe incluir en el layout principal de la aplicación
 */
export default function ServiceWorkerInit() {
  const [offlineMode, setOfflineMode] = useState(false);
  const [swReady, setSwReady] = useState(false);

  const initializeServiceWorker = useCallback(async () => {
    try {
      console.log("Inicializando Service Worker...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const registration = await navigator.serviceWorker.register(
        "/sw-custom.js",
        {
          scope: "/",
        }
      );

      console.log("Service Worker registrado con scope:", registration.scope);

      if (registration.installing) {
        console.log("Service Worker instalando...");
        registration.installing.addEventListener("statechange", (e) => {
          console.log("Estado del Service Worker cambiado a:", e.target.state);
          if (e.target.state === "activated") setSwReady(true);
        });
      } else if (registration.waiting) {
        console.log("Service Worker esperando activación...");
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      } else if (registration.active) {
        console.log("Service Worker ya activo");
        setSwReady(true);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        console.log("Nuevo Service Worker encontrado, instalando...");
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Lógica para notificar actualización
          }
        });
      });

      if (registration.active) {
        if (navigator.onLine && "sync" in registration) {
          await registration.sync.register("sync-pending-surveys");
          console.log("Background sync registrado");
        }
      } else {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          async () => {
            if (navigator.onLine && "sync" in registration) {
              await registration.sync.register("sync-pending-surveys");
              console.log("Background sync registrado después de activación");
            }
          }
        );
      }

      if (navigator.serviceWorker.controller) setSwReady(true);

      console.log("Enviando mensaje de prueba al Service Worker...");
      if (registration.active) {
        registration.active.postMessage({
          type: "TEST_MESSAGE",
          payload: { test: true, timestamp: Date.now() },
        });
      }
    } catch (error) {
      console.error("Error inicializando Service Worker:", error);
      toast.error("No se pudo activar el modo offline");
    }
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      if (process.env.NODE_ENV === "development")
        console.log("Service Worker deshabilitado en modo desarrollo");
      else if (typeof window === "undefined")
        console.log("Service Worker no se puede registrar en el servidor");
      else console.warn("Este navegador no soporta Service Workers");
      return;
    }

    const init = () => {
      if (document.readyState === "complete") {
        initializeServiceWorker();
      } else {
        window.addEventListener("load", initializeServiceWorker);
      }
    };
    init();

    const handleOnline = () => {
      console.log("Conexión a internet recuperada");
      setOfflineMode(false);
      toast.success("Conexión a internet recuperada");
      navigator.serviceWorker.ready.then((registration) => {
        if ("sync" in registration) {
          registration.sync
            .register("sync-pending-surveys")
            .catch((err) => console.error("Error al registrar sync", err));
        }
      });
    };

    const handleOffline = () => {
      console.log("Conexión a internet perdida");
      setOfflineMode(true);
      toast.warn("Modo offline activado. Los datos se guardarán localmente.");
    };

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === "SURVEYS_SYNCED") {
        toast.success(`¡${event.data.count} respuestas locales sincronizadas!`);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage
    );
    setOfflineMode(!navigator.onLine);

    return () => {
      window.removeEventListener("load", initializeServiceWorker);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, [initializeServiceWorker]);

  // No renderiza nada visible, sólo inicializa el SW
  return null;
}
