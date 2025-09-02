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

// Política de navegación: mantener app-shell del dashboard en offline (registrado ANTES de Serwist)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate") return;

  const handleNavigation = async () => {
    // 1) Intentar red si hay conexión
    try {
      const netResponse = await fetch(request);
      const netUrl = new URL(netResponse.url);
      const isRedirect =
        netResponse.type === "opaqueredirect" ||
        (netResponse.status >= 300 && netResponse.status < 400);
      // Bloquear redirecciones a /login para no propagarlas al flujo offline
      if (isRedirect && netUrl.pathname === "/login") {
        throw new Error("Redirect to /login blocked for offline shell");
      }
      return netResponse;
    } catch {
      // 2) Offline: intentar el propio request ignorando search (RSC/queries)
      try {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) {
          const cachedUrl = new URL(cached.url);
          const cachedIsRedirect =
            cached.type === "opaqueredirect" ||
            (cached.status >= 300 && cached.status < 400);
          if (!cachedIsRedirect && cachedUrl.pathname !== "/login") {
            return cached;
          }
        }
      } catch {
        // ignore
      }

      // 3) App-shell estable para el encuestador
      let shell = await caches.match("/dashboard/encuestas", {
        ignoreSearch: true,
      });
      if (shell) {
        try {
          const shellUrl = new URL(shell.url);
          const shellIsRedirect =
            shell.type === "opaqueredirect" ||
            (shell.status >= 300 && shell.status < 400);
          if (shellUrl.pathname !== "/login" && !shellIsRedirect) {
            return shell;
          }
        } catch {
          // ignore
        }
        // Si el supuesto shell es login/redirección, limpiarlo e intentar otra vez
        try {
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            const cache = await caches.open(name);
            await cache.delete(new Request("/dashboard/encuestas"));
          }
        } catch {
          // ignore
        }
        shell = undefined;
      }

      // 4) Último recurso: página offline
      const fallback = await caches.match("/offline", { ignoreSearch: true });
      if (fallback) return fallback;

      // 5) Como extremo, una respuesta básica
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }
  };

  event.respondWith(handleNavigation());
});

serwist.addEventListeners();

// Precache de rutas de navegación críticas del pollster
serwist.addToPrecacheList([
  { url: "/dashboard/encuestas", revision: "1" },
  { url: "/dashboard/encuestas/responder", revision: "1" },
  { url: "/dashboard/perfil", revision: "1" },
  { url: "/dashboard/configuracion", revision: "1" },
  { url: "/dashboard", revision: "1" },
  { url: "/offline", revision: "1" },
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

// Limpieza de cualquier entrada de /login previamente cacheada
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          await Promise.all(
            requests.map(async (req) => {
              const url = new URL(req.url);
              if (url.pathname === "/login") {
                return cache.delete(req);
              }
              if (url.pathname === "/dashboard/encuestas") {
                try {
                  const resp = await cache.match(req);
                  if (resp) {
                    const respUrl = new URL(resp.url);
                    const isRedirect =
                      resp.type === "opaqueredirect" ||
                      (resp.status >= 300 && resp.status < 400);
                    if (respUrl.pathname === "/login" || isRedirect) {
                      return cache.delete(req);
                    }
                  }
                } catch {
                  // ignore
                }
              }
              return Promise.resolve(false);
            })
          );
        })
      );
      // Garantizar que el SW controle inmediatamente
      await self.clients.claim();
    })()
  );
});

// (handler movido arriba para tomar precedencia)
