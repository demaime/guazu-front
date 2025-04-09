const globals = require("globals");
const js = require("@eslint/js");
// const tseslint = require("typescript-eslint"); // Probablemente no necesario si no hay TS
const nextPlugin = require("@next/eslint-plugin-next");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");

module.exports = [
  js.configs.recommended,
  {
    // Configuración global aplica a todos los archivos
    languageOptions: {
      globals: {
        ...globals.browser, // <-- Añadir globales del navegador
        ...globals.node, // Mantener globales de Node si son necesarios
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
