"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

/**
 * Componente para inicializar y gestionar el Service Worker
 * Se debe incluir en el layout principal de la aplicación
 */
export default function ServiceWorkerInit() {
  const [offlineMode, setOfflineMode] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    // Solo inicializar Service Worker en producción
    if (process.env.NODE_ENV === "development") {
      console.log("Service Worker deshabilitado en modo desarrollo");
      return;
    }

    // Inicializar Service Worker
    if ("serviceWorker" in navigator) {
      const initializeServiceWorker = async () => {
        try {
          console.log("Inicializando Service Worker...");

          // Esperar un momento para asegurar que la página esté completamente cargada
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Registrar el Service Worker
          const registration = await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
            }
          );

          console.log(
            "Service Worker registrado con scope:",
            registration.scope
          );

          // Manejar estados del Service Worker
          if (registration.installing) {
            console.log("Service Worker instalando...");
            registration.installing.addEventListener("statechange", (e) => {
              console.log(
                "Estado del Service Worker cambiado a:",
                e.target.state
              );
              if (e.target.state === "activated") {
                setSwReady(true);
              }
            });
          } else if (registration.waiting) {
            console.log("Service Worker esperando activación...");
            // Forzar activación
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          } else if (registration.active) {
            console.log("Service Worker ya activo");
            setSwReady(true);
          }

          // Manejar actualizaciones del Service Worker
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("Nuevo Service Worker encontrado, instalando...");

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // toast.info(
                //   "Nueva versión disponible. Actualiza la página para aplicar los cambios."
                // );
              }
            });
          });

          // Configurar sincronización después de estar completamente activo
          if (registration.active) {
            try {
              if (navigator.onLine && "sync" in registration) {
                await registration.sync.register("sync-pending-surveys");
                console.log("Background sync registrado");
              }
            } catch (syncError) {
              console.error("Error registrando sync:", syncError);
            }
          } else {
            // Si no está activo aún, esperar a que lo esté
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              async () => {
                try {
                  if (navigator.onLine && "sync" in registration) {
                    await registration.sync.register("sync-pending-surveys");
                    console.log(
                      "Background sync registrado después de activación"
                    );
                  }
                } catch (syncError) {
                  console.error(
                    "Error registrando sync después de activación:",
                    syncError
                  );
                }
              }
            );
          }

          // Establecer estado de preparado basado en la presencia de un controlador
          if (navigator.serviceWorker.controller) {
            setSwReady(true);
          }

          // Verificar mensaje de prueba en consola
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
      };

      // Iniciar el proceso solo si la ventana está cargada completamente
      if (document.readyState === "complete") {
        initializeServiceWorker();
      } else {
        window.addEventListener("load", initializeServiceWorker);
      }
    } else {
      console.warn("Este navegador no soporta Service Workers");
      toast.warning("Tu navegador no soporta el modo offline");
    }

    // Manejar cambios de conectividad
    const handleOnline = () => {
      console.log("Conexión a internet recuperada");
      setOfflineMode(false);
      toast.success("Conexión a internet recuperada");

      // Intentar sincronizar
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if ("sync" in registration) {
            registration.sync
              .register("sync-pending-surveys")
              .then(() => console.log("Sync registrado al recuperar conexión"))
              .catch((err) => console.error("Error al registrar sync", err));
          }
        });
      }
    };

    const handleOffline = () => {
      console.log("Conexión a internet perdida");
      setOfflineMode(true);
      toast.warn("Modo offline activado. Los datos se guardarán localmente.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Establecer estado inicial
    setOfflineMode(!navigator.onLine);

    // Listener para mensajes del Service Worker
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === "SURVEYS_SYNCED") {
        const count = event.data.count;
        if (count === 1) {
          toast.success(
            "¡1 encuesta local ha sido sincronizada con el servidor!"
          );
        } else {
          toast.success(
            `¡${count} encuestas locales han sido sincronizadas con el servidor!`
          );
        }
      }
    };

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage
    );

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("load", initializeServiceWorker);
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, []);

  // No renderiza nada visible, sólo inicializa el SW
  return null;
}
