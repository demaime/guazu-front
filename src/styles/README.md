# Estilos de SurveyJS para Guazú

## Descripción General

Este directorio contiene la configuración de estilos personalizada para SurveyJS integrada con el sistema de temas de Guazú.

## Archivos

### `survey-themes.js`

Contiene los temas personalizados de SurveyJS que se integran con las variables CSS de Guazú:

- **GuazuLightTheme**: Tema claro que usa las variables CSS del modo claro
- **GuazuDarkTheme**: Tema oscuro que usa las variables CSS del modo oscuro

### `survey-styles.css`

Estilos CSS adicionales que complementan los temas de SurveyJS:

- Ajustes de responsividad para matrices
- Estilos para elementos de entrada (radio buttons, checkboxes)
- Configuración de campos de texto y áreas
- Manejo de errores y validación
- Oculta elementos innecesarios como la página de completado nativa

## Integración con el Sistema de Temas

Los temas personalizados utilizan las variables CSS definidas en `globals.css`:

### Variables Principales

- `--primary`, `--primary-dark`, `--primary-light`: Colores primarios
- `--background`, `--card-background`, `--input-background`: Fondos
- `--text-primary`, `--text-secondary`, `--text-muted`: Textos
- `--card-border`: Bordes
- `--hover-bg`: Estados hover

### Cambio Automático de Tema

Los temas se aplican automáticamente según el contexto:

```javascript
if (theme === "dark") model.applyTheme(GuazuDarkTheme);
else model.applyTheme(GuazuLightTheme);
```

## Ventajas de esta Implementación

1. **Consistencia**: Los formularios mantienen la misma apariencia que el resto de la aplicación
2. **Mantenimiento**: Cambios en las variables CSS se reflejan automáticamente en SurveyJS
3. **Performance**: Sin sobrescritura masiva de estilos CSS
4. **Limpieza**: El código CSS es mucho más simple y mantenible
5. **Accesibilidad**: Los elementos de entrada son claramente visibles en ambos modos

## Solución de Problemas Previos

### Antes:

- ❌ Inputs duplicados (nativos + decoradores visibles)
- ❌ CSS sobrecargado con especificidad extrema
- ❌ Conflictos entre temas de SurveyJS y sistema propio
- ❌ Más de 700 líneas de CSS complejas

### Después:

- ✅ Un solo input visible y estilizado correctamente
- ✅ CSS limpio con ~150 líneas específicas
- ✅ Integración nativa con el sistema de temas
- ✅ Temas que siguen las mejores prácticas de SurveyJS
