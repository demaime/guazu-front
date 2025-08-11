import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  // Fallback de documento cuando no hay red
  fallbacks: {
    entries: [
      {
        url: "/offline",
        revision: "1",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Precache de rutas de navegación críticas del pollster
serwist.addToPrecacheList([
  { url: "/dashboard/encuestas", revision: "1" },
  { url: "/dashboard/perfil", revision: "1" },
  { url: "/dashboard/configuracion", revision: "1" },
]);
