# Funcionalidad Offline - Guazu 2.0

## Resumen

Se ha implementado funcionalidad offline completa en Guazu 2.0, permitiendo a los usuarios navegar, descargar encuestas y responder sin conexión a internet.

## Características Implementadas

### 1. **Almacenamiento Local con PouchDB**

- **Encuestas Offline**: Se almacenan en `surveys_db` con metadatos de descarga
- **Respuestas Pendientes**: Se guardan en `responses_db` hasta la sincronización
- **Sincronización**: Service Worker maneja la sincronización automática cuando se recupera la conexión

### 2. **Hook usePouchDB**

- Manejo centralizado de datos offline
- Funciones para descargar, obtener y eliminar encuestas offline
- Gestión de respuestas pendientes de sincronización
- Estados de carga y errores

### 3. **Indicadores Visuales**

- **OfflineIndicator**: Panel flotante que muestra estado de conexión, encuestas offline y respuestas pendientes
- **OfflineDownloadButton**: Botón para descargar/eliminar encuestas para uso offline
- Indicadores en SurveyList para identificar encuestas disponibles offline

### 4. **Navegación Offline**

- Cache mejorado con next-pwa para rutas de encuestas
- Estrategia `CacheFirst` para páginas de responder encuestas
- Pre-cache automático cuando se descarga una encuesta

### 5. **Service Worker Personalizado**

- Manejo de mensajes del cliente para funcionalidades específicas
- Sincronización en background de respuestas pendientes
- Gestión de errores y retry automático

## Arquitectura Técnica

### Base de Datos Locales

```javascript
// surveys_db: Encuestas descargadas para uso offline
{
  _id: "survey_[surveyId]",
  surveyId: "string",
  title: "string",
  description: "string",
  survey: {}, // Datos completos de la encuesta
  surveyInfo: {},
  downloadedAt: "ISO date",
  availableOffline: true
}

// responses_db: Respuestas pendientes de sincronización
{
  _id: "response_[surveyId]_[timestamp]",
  surveyId: "string",
  responses: {}, // Respuestas del usuario
  timestamp: "ISO date",
  synced: false,
  // metadatos adicionales...
}
```

### Configuración PWA

- **next-pwa** habilitado en desarrollo para testing
- Cache específico para rutas de encuestas (`/dashboard/encuestas/**/responder`)
- Service worker personalizado para lógica de sincronización

## Flujo de Usuario

### Descarga para Offline

1. Usuario navega a lista de encuestas
2. Hace clic en botón "Descargar offline"
3. La encuesta se guarda en `surveys_db`
4. La ruta se pre-cachea automáticamente
5. Indicador visual muestra que está disponible offline

### Responder Offline

1. Usuario accede a encuesta sin conexión
2. La encuesta se carga desde `surveys_db`
3. Indicador muestra que se cargó desde offline
4. Al completar, respuesta se guarda en `responses_db`
5. Service worker registra para sincronización automática

### Sincronización Automática

1. Cuando se recupera conexión, SW detecta el cambio
2. Respuestas pendientes se envían automáticamente al servidor
3. Usuario recibe notificación de sincronización exitosa
4. Datos se marcan como sincronizados

## Testing de Funcionalidad Offline

⚠️ **IMPORTANTE**: Los Service Workers NO funcionan en modo desarrollo (`npm run dev`).

### Setup para Testing

```bash
# 1. Hacer build de la aplicación
npm run build

# 2. Iniciar en modo producción
npm start

# 3. Abrir http://localhost:3000 en el navegador
```

### Pasos de Testing

#### Test 1: Descarga de Encuesta

1. Con conexión activa, ir a `/dashboard/encuestas`
2. Hacer clic en "Descargar offline" en cualquier encuesta
3. Verificar toast de confirmación
4. Confirmar que el botón cambia a "Disponible offline"

#### Test 2: Navegación Offline

1. Abrir DevTools → Network → Marcar "Offline"
2. Navegar a la encuesta descargada
3. Verificar que carga correctamente
4. Confirmar indicador azul "cargada desde offline"

#### Test 3: Respuesta Offline

1. Mantener modo offline activado
2. Completar la encuesta
3. Verificar mensaje de guardado local
4. Confirmar que aparece en respuestas pendientes del OfflineIndicator

#### Test 4: Sincronización Automática

1. Desmarcar "Offline" en DevTools
2. Esperar unos segundos
3. Verificar toast de sincronización exitosa
4. Confirmar que contador de pendientes se reduce

#### Test 5: Indicador Offline

1. Hacer clic en el indicador flotante (bottom-right)
2. Verificar estado de conexión
3. Probar botón "Sincronizar" manual
4. Probar botón "Limpiar" datos offline

## Componentes Clave

### Hooks

- `useNetworkStatus`: Detección de estado online/offline
- `usePouchDB`: Manejo completo de datos offline

### Componentes UI

- `OfflineIndicator`: Indicador flotante de estado
- `OfflineDownloadButton`: Botón de descarga para offline
- Indicadores integrados en SurveyList

### Configuración

- `next.config.mjs`: Configuración PWA y cache
- `public/sw-custom.js`: Service worker personalizado
- `src/lib/pouchdb.js`: Utilidades de base de datos

## Manejo de Errores

### Errores de Red

- Detección automática con `useNetworkStatus`
- Fallback a datos offline cuando no hay conexión
- Retry automático cuando se recupera conexión

### Errores de Sincronización

- Retry automático con exponential backoff
- Manejo de errores 4xx vs 5xx
- Limpieza automática de datos corruptos

### Errores de Almacenamiento

- Validación de datos antes de guardar
- Manejo de conflictos de PouchDB
- Indicadores de error en UI

## Troubleshooting

### Service Worker no funciona

- Verificar que está en modo producción (`npm run build && npm start`)
- Comprobar en DevTools → Application → Service Workers
- Limpiar cache del navegador si es necesario

### Datos no se sincronizan

- Verificar conexión de red
- Comprobar token de autenticación válido
- Revisar logs del Service Worker en DevTools

### Encuesta no carga offline

- Verificar que se descargó correctamente
- Comprobar que existe en IndexedDB (DevTools → Application → Storage)
- Intentar re-descargar la encuesta

## Limitaciones

1. **Service Workers**: Solo funcionan en producción y HTTPS
2. **Almacenamiento**: Limitado por cuotas del navegador
3. **Sincronización**: Depende de conexión estable para completarse
4. **Cache**: Las páginas se cachean por tiempo limitado

## Próximas Mejoras

1. **Sincronización Inteligente**: Priorizar respuestas por fecha/importancia
2. **Gestión de Cuotas**: Alertas cuando se acerca al límite de almacenamiento
3. **Modo Offline First**: Cargar siempre desde offline cuando esté disponible
4. **Compresión de Datos**: Reducir tamaño de datos almacenados localmente
