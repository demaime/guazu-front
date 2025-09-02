"use client";

import { useEffect, useState } from "react";

let deferredPrompt;

export default function InstallPWA() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showIncognitoModal, setShowIncognitoModal] = useState(false);
  const [showAndroidHelpModal, setShowAndroidHelpModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return (
        window.matchMedia &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          window.navigator.standalone === true)
      );
    } catch {
      return false;
    }
  });

  // Función para detectar modo incógnito
  const detectIncognito = async () => {
    try {
      // Método 1: Storage quota en incógnito es muy limitado
      const quota = await navigator.storage?.estimate?.();
      if (quota && quota.quota < 120000000) return true; // < 120MB sugiere incógnito

      // Método 2: sessionStorage se comporta diferente
      try {
        sessionStorage.setItem("__incognito_test", "1");
        sessionStorage.removeItem("__incognito_test");
        return false;
      } catch {
        return true;
      }
    } catch {
      // Método 3: IndexedDB fallback
      return new Promise((resolve) => {
        const db = indexedDB.open("__incognito_test");
        db.onsuccess = () => resolve(false);
        db.onerror = () => resolve(true);
      });
    }
  };

  useEffect(() => {
    const initDetection = async () => {
      // Detección de plataforma
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );
      const isIOSSafari = isIOS && isSafari;

      // Detección PWA instalada
      const isPWA =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

      setIsInstalled(!!isPWA);

      // Detección modo incógnito
      const isIncognito = await detectIncognito();

      // Si ya está instalada la PWA, no mostramos el botón en modo standalone
      if (isPWA) {
        setShowPrompt(false);
        return;
      }

      // Mostrar el botón en el resto de los casos
      setShowPrompt(true);

      // Si estamos en modo incógnito, mostrar botón pero con modal específico
      if (isIncognito) {
        setShowPrompt(true);
        return;
      }

      // Para iOS Safari, mostrar botón que abrirá modal
      if (isIOSSafari) {
        setShowPrompt(true);
        return;
      }

      // Para navegadores compatibles con beforeinstallprompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setShowPrompt(true);
      };

      const handleAppInstalled = () => {
        deferredPrompt = null;
        setShowPrompt(false);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    };

    initDetection();
  }, []);

  const handleInstall = async () => {
    // Detectar contexto actual
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isIOS && isSafari;
    const isIncognito = await detectIncognito();

    // Prioridad: Incógnito > iOS > beforeinstallprompt
    if (isIncognito) {
      setShowIncognitoModal(true);
      return;
    }

    if (isIOSSafari) {
      setShowIOSModal(true);
      return;
    }

    // Si ya está instalada, informamos y no hacemos nada más
    if (isInstalled) {
      try {
        // Evitar depender de Toast: usar alerta simple para universalidad
        alert("La aplicación ya está instalada en este dispositivo.");
      } catch {}
      return;
    }

    // Para navegadores con beforeinstallprompt
    if (!deferredPrompt) {
      // Fallback: mostrar ayuda para Android/Chrome cuando no llega el evento
      setShowAndroidHelpModal(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    deferredPrompt = null;
    setShowPrompt(false);
  };

  const closeIOSModal = () => {
    setShowIOSModal(false);
  };

  const closeIncognitoModal = () => {
    setShowIncognitoModal(false);
  };

  // No mostrar nada si explícitamente se ocultó
  if (!showPrompt || isInstalled) return null;

  return (
    <>
      {/* Botón flotante */}
      <div className="install-button-float">
        <button
          onClick={handleInstall}
          className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-4 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg font-medium text-xs sm:text-sm hover:bg-white/30 hover:border-white/50 cursor-pointer transition-all duration-200"
        >
          Instalar
        </button>
      </div>

      {/* Modal para iOS */}
      {showIOSModal && (
        <div className="install-modal-overlay" onClick={closeIOSModal}>
          <div
            className="install-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Instalar Guazú</h2>

              <div className="space-y-4 text-white">
                <div className="text-left">
                  <p className="font-medium mb-2">Paso 1:</p>
                  <p className="text-sm opacity-90">
                    Toca el botón Compartir (el cuadrado con la flecha hacia
                    arriba)
                  </p>
                </div>

                <div className="text-left">
                  <p className="font-medium mb-2">Paso 2:</p>
                  <p className="text-sm opacity-90">
                    Selecciona "Agregar a pantalla de inicio"
                  </p>
                </div>
              </div>

              <button
                onClick={closeIOSModal}
                className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-6 py-2 rounded-lg font-medium hover:bg-white/30 hover:border-white/50 transition-all duration-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para modo incógnito */}
      {showIncognitoModal && (
        <div className="install-modal-overlay" onClick={closeIncognitoModal}>
          <div
            className="install-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Instalar Guazú</h2>

              <div className="space-y-4 text-white">
                <p className="text-base opacity-90">
                  Para instalar la aplicación, necesitas usar una ventana normal
                  del navegador.
                </p>

                <div className="text-left bg-white/10 rounded-lg p-4">
                  <p className="font-medium mb-2">¿Cómo hacerlo?</p>
                  <p className="text-sm opacity-90">
                    Sal del modo incógnito y visita esta página nuevamente para
                    poder instalar la aplicación.
                  </p>
                </div>
              </div>

              <button
                onClick={closeIncognitoModal}
                className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-6 py-2 rounded-lg font-medium hover:bg-white/30 hover:border-white/50 transition-all duration-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ayuda Android/Chrome cuando no hay beforeinstallprompt */}
      {showAndroidHelpModal && (
        <div
          className="install-modal-overlay"
          onClick={() => setShowAndroidHelpModal(false)}
        >
          <div
            className="install-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Instalar Guazú</h2>
              <div className="space-y-4 text-white">
                <p className="text-base opacity-90">
                  Para instalar, abre el menú del navegador (⋮) y elige "Agregar
                  a pantalla de inicio".
                </p>
              </div>
              <button
                onClick={() => setShowAndroidHelpModal(false)}
                className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-6 py-2 rounded-lg font-medium hover:bg-white/30 hover:border-white/50 transition-all duration-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
