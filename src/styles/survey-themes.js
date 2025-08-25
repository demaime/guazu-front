// Temas personalizados de SurveyJS para Guazú
// Estos temas usan las variables CSS del sistema de temas de Guazú

export const GuazuLightTheme = {
  themeName: "guazu-light",
  colorPalette: "light",
  isPanelless: true,
  cssVariables: {
    // Colores principales
    "--sjs-primary-backcolor": "var(--primary)",
    "--sjs-primary-forecolor": "#ffffff",
    "--sjs-primary-backcolor-light": "var(--primary-light)",
    "--sjs-primary-backcolor-dark": "var(--primary-dark)",

    // Fondos
    "--sjs-general-backcolor": "var(--background)",
    "--sjs-general-backcolor-dark": "var(--card-background)",
    "--sjs-general-backcolor-dim": "var(--card-background)",
    "--sjs-general-backcolor-dim-light": "var(--input-background)",

    // Texto
    "--sjs-general-forecolor": "var(--text-primary)",
    "--sjs-general-forecolor-light": "var(--text-secondary)",
    "--sjs-general-dim-forecolor": "var(--text-muted)",

    // Bordes - más contrastantes para inputs
    "--sjs-general-border": "#d1d5db",
    "--sjs-general-border-light": "var(--card-border)",

    // Estados hover
    "--sjs-primary-backcolor-semi": "rgba(63, 81, 181, 0.15)",

    // Tipografía
    "--sjs-font-family":
      "var(--font-mulish), system-ui, -apple-system, sans-serif",
    "--sjs-font-size": "1rem", // 16px
    "--sjs-font-weight": "400",

    // Elementos específicos
    "--sjs-general-backcolor-disabled": "var(--disabled-bg)",
    "--sjs-general-forecolor-disabled": "var(--primary-text)",

    // Errores
    "--sjs-general-danger": "#ef4444",
    "--sjs-general-danger-light": "#fee2e2",

    // Éxito
    "--sjs-general-success": "#22c55e",
    "--sjs-general-success-light": "#dcfce7",

    // Advertencia
    "--sjs-general-warning": "#f59e0b",
    "--sjs-general-warning-light": "#fef3c7",

    // Espaciado
    "--sjs-corner-radius": "0.5rem",
    "--sjs-base-unit": "8px",

    // Elementos de formulario específicos
    "--sjs-editor-background": "var(--input-background)",
    "--sjs-editor-background-hover": "var(--input-background)",
    "--sjs-editorpanel-backcolor": "var(--card-background)",
    "--sjs-editorpanel-hovercolor": "var(--hover-bg)",

    // Botones
    "--sjs-general-backcolor-dim-dark": "var(--card-border)",

    // Progreso
    "--sjs-progress-buttons-color": "var(--primary)",
    "--sjs-progress-buttons-line-color": "var(--card-border)",

    // Shadows
    "--sjs-shadow-small": "0 1px 3px rgba(0, 0, 0, 0.1)",
    "--sjs-shadow-medium": "0 4px 6px rgba(0, 0, 0, 0.1)",
    "--sjs-shadow-large": "0 10px 15px rgba(0, 0, 0, 0.1)",
  },
};

export const GuazuDarkTheme = {
  themeName: "guazu-dark",
  colorPalette: "dark",
  isPanelless: true,
  cssVariables: {
    // Colores principales
    "--sjs-primary-backcolor": "var(--primary-light)",
    "--sjs-primary-forecolor": "#000000",
    "--sjs-primary-backcolor-light": "var(--primary-light)",
    "--sjs-primary-backcolor-dark": "var(--primary)",

    // Fondos
    "--sjs-general-backcolor": "var(--background)",
    "--sjs-general-backcolor-dark": "var(--card-background)",
    "--sjs-general-backcolor-dim": "var(--card-background)",
    "--sjs-general-backcolor-dim-light": "var(--input-background)",

    // Texto
    "--sjs-general-forecolor": "var(--text-primary)",
    "--sjs-general-forecolor-light": "var(--text-secondary)",
    "--sjs-general-dim-forecolor": "var(--text-muted)",

    // Bordes - más contrastantes para inputs
    "--sjs-general-border": "#475569",
    "--sjs-general-border-light": "var(--card-border)",

    // Estados hover
    "--sjs-primary-backcolor-semi": "rgba(128, 145, 245, 0.2)",

    // Tipografía
    "--sjs-font-family":
      "var(--font-mulish), system-ui, -apple-system, sans-serif",
    "--sjs-font-size": "1rem", // 16px
    "--sjs-font-weight": "400",

    // Elementos específicos
    "--sjs-general-backcolor-disabled": "var(--disabled-bg)",
    "--sjs-general-forecolor-disabled": "var(--disabled-text)",

    // Errores
    "--sjs-general-danger": "#f87171",
    "--sjs-general-danger-light": "#7f1d1d",

    // Éxito
    "--sjs-general-success": "#4ade80",
    "--sjs-general-success-light": "#14532d",

    // Advertencia
    "--sjs-general-warning": "#fbbf24",
    "--sjs-general-warning-light": "#78350f",

    // Espaciado
    "--sjs-corner-radius": "0.5rem",
    "--sjs-base-unit": "8px",

    // Elementos de formulario específicos
    "--sjs-editor-background": "var(--input-background)",
    "--sjs-editor-background-hover": "var(--input-background)",
    "--sjs-editorpanel-backcolor": "var(--card-background)",
    "--sjs-editorpanel-hovercolor": "var(--hover-bg)",

    // Botones
    "--sjs-general-backcolor-dim-dark": "var(--card-border)",

    // Progreso
    "--sjs-progress-buttons-color": "var(--primary-light)",
    "--sjs-progress-buttons-line-color": "var(--card-border)",

    // Shadows para modo oscuro
    "--sjs-shadow-small": "0 1px 3px rgba(0, 0, 0, 0.3)",
    "--sjs-shadow-medium": "0 4px 6px rgba(0, 0, 0, 0.3)",
    "--sjs-shadow-large": "0 10px 15px rgba(0, 0, 0, 0.3)",
  },
};
