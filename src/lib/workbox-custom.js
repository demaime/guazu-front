// Helper para registro del service worker con workbox-window
import { Workbox } from "workbox-window";

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const wb = new Workbox("/sw.js");

    wb.addEventListener("installed", () => {
      console.log("Service Worker instalado");
    });

    wb.addEventListener("activated", () => {
      console.log("Service Worker activado");
    });

    wb.addEventListener("controlling", () => {
      console.log("Service Worker controlando esta página");
    });

    wb.addEventListener("waiting", () => {
      console.log("Hay un nuevo Service Worker esperando activarse");
    });

    // Registrar el SW
    wb.register()
      .then((registration) => {
        console.log("Service Worker registrado con éxito", registration);

        // Registrar sync cuando se recupere la conexión
        if ("sync" in registration) {
          navigator.serviceWorker.ready.then((reg) => {
            // Verificar si estamos online
            if (navigator.onLine) {
              reg.sync
                .register("sync-pending-surveys")
                .then(() =>
                  console.log("Sync registrado para encuestas pendientes")
                )
                .catch((err) => console.error("Error al registrar sync", err));
            }

            // Escuchar eventos de cambio de conectividad
            window.addEventListener("online", () => {
              reg.sync
                .register("sync-pending-surveys")
                .then(() =>
                  console.log("Sync registrado al recuperar conexión")
                )
                .catch((err) => console.error("Error al registrar sync", err));
            });
          });
        }
      })
      .catch((error) => {
        console.error("Error al registrar el Service Worker:", error);
      });

    return wb;
  }

  return null;
}
