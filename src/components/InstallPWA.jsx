"use client";

import { useEffect, useState } from "react";

let deferredPrompt;

export default function InstallPWA() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Detección de plataforma
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isIOS && isSafari;

    // Detección PWA instalada
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    // Si ya está instalado como PWA, no mostrar nada
    if (isPWA) {
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
  }, []);

  const handleInstall = async () => {
    // Detectar iOS Safari para mostrar modal
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isIOS && isSafari;

    if (isIOSSafari) {
      setShowIOSModal(true);
      return;
    }

    // Para navegadores con beforeinstallprompt
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    deferredPrompt = null;
    setShowPrompt(false);
  };

  const closeIOSModal = () => {
    setShowIOSModal(false);
  };

  // No mostrar nada si no hay prompt disponible
  if (!showPrompt) return null;

  return (
    <>
      {/* Botón flotante */}
      <div className="install-button-float">
        <button
          onClick={handleInstall}
          className="bg-primary-dark text-primary-light px-6 py-3 rounded-lg shadow-lg font-medium text-sm hover:bg-[var(--primary-light)] hover:text-[var(--primary-dark)] cursor-pointer transition-colors duration-200"
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
                className="bg-white text-primary px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
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
