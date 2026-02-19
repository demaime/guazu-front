# Guazú — Plataforma de Gestión de Encuestas de Campo

Guazú es una plataforma web para la gestión y ejecución de encuestas de campo. Permite a administradores diseñar encuestas, asignarlas a encuestadores con cuotas geográficas y demográficas, y hacer seguimiento del progreso en tiempo real. Funciona como **PWA** con soporte offline.

## Demo

🌐 [guazu.app](https://guazu.app)

---

## Características principales

- **Panel de administración** — creación y edición de encuestas con SurveyJS Creator, gestión de usuarios, asignación de cuotas por encuestador, seguimiento de respuestas y exportación a Excel y PDF
- **Panel de supervisión** — vista agregada del progreso de encuestadores y cuotas en tiempo real
- **Panel de encuestador** — interfaz optimizada para mobile para responder encuestas y ver el progreso individual de cuotas
- **Sistema de cuotas** — definición de cuotas simples y combinadas (ej. género × rango etario) con validación automática al responder
- **Geolocalización** — visualización de respuestas en mapa con Google Maps y Leaflet
- **Modo offline** — con sincronización automática al recuperar conectividad (PouchDB + Serwist Service Worker)
- **Exportación de datos** — descarga de respuestas en formato Excel (xlsx) y reportes en PDF
- **Autenticación JWT** — con roles diferenciados (admin, supervisor, encuestador), activación por email y recuperación de contraseña
- **Animaciones y UX** — transiciones con Framer Motion, tooltips con Tippy.js, notificaciones con React Toastify y onboarding guiado con Driver.js

---

## Stack tecnológico

### Frontend
| Tecnología | Uso |
|---|---|
| [Next.js 15](https://nextjs.org) (App Router) | Framework principal |
| [React 18](https://react.dev) | UI |
| [Tailwind CSS 4](https://tailwindcss.com) | Estilos |
| [SurveyJS](https://surveyjs.io) | Motor de encuestas (rendering y lógica) |
| [Framer Motion](https://www.framer.com/motion/) | Animaciones |
| [Recharts](https://recharts.org) | Gráficos de estadísticas |
| [PouchDB](https://pouchdb.com) | Almacenamiento local para modo offline |
| [Serwist](https://serwist.pages.dev) | Service Worker / PWA |
| [Google Maps API](https://developers.google.com/maps) | Mapa de respuestas |
| [Leaflet](https://leafletjs.com) | Mapas alternativos |
| [React PDF](https://react-pdf.org) | Generación de reportes PDF |
| [xlsx](https://sheetjs.com) | Exportación a Excel |

### Backend
> Repositorio separado — API REST construida con Node.js, Express y MongoDB (Mongoose). Desplegada en Heroku.
