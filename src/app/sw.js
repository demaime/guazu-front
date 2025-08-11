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

// Precache de Google Fonts utilizados por SurveyJS (Open Sans)
// - Descarga la hoja de estilos y todas las URLs .woff2 referenciadas
// - Esto evita errores de fuentes en la primera carga offline
const OPEN_SANS_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap";

async function precacheGoogleFonts() {
  try {
    // Obtener CSS de Google Fonts
    const cssResponse = await fetch(OPEN_SANS_CSS_URL, { credentials: "omit" });
    const cssText = await cssResponse.text();

    // Extraer URLs de woff2 de la hoja de estilo
    const woff2Urls = Array.from(
      cssText.matchAll(/https:\/\/[^)]+\.woff2/g)
    ).map((m) => m[0]);

    // Guardar CSS en su propio cache
    const cssCache = await caches.open("google-fonts-stylesheets");
    await cssCache.put(
      OPEN_SANS_CSS_URL,
      new Response(cssText, { headers: { "Content-Type": "text/css" } })
    );

    // Guardar fuentes en cache dedicado
    const fontCache = await caches.open("google-fonts-webfonts");
    await Promise.all(
      woff2Urls.map((url) =>
        fontCache.add(
          new Request(url, { mode: "no-cors", credentials: "omit" })
        )
      )
    );
  } catch (err) {
    // Silencioso: si falla, se usará el runtime caching ya configurado
    // console.warn("[SW] No se pudo precachear Google Fonts", err);
    void err; // marcar la variable como usada para evitar warning de ESLint
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheGoogleFonts());
});
