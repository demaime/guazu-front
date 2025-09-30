"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, PlayCircle } from "lucide-react";

const TUTORIAL_STEPS = [
  {
    element: '[data-tutorial="menu-button"]',
    popover: {
      title: "Menú Principal",
      description:
        "Aquí puedes navegar por las secciones de la aplicación, editar tu perfil, ver tus encuestas asignadas y tu configuración personal de la aplicación.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tutorial="status-indicators"]',
    popover: {
      title: "Indicadores de Estado",
      description:
        "Estos íconos muestran tu estado de conexión a internet y los permisos de ubicación. Puedes trabajar offline y sincronizar después.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tutorial="test-survey"]',
    popover: {
      title: "Encuesta de Prueba",
      description:
        "Esta es una encuesta de prueba. Úsala para familiarizarte con el sistema sin afectar datos reales.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tutorial="respond-button"]',
    popover: {
      title: "Último Paso: Responder",
      description:
        'Aquí puedes comenzar a responder encuestas. Presiona "¡Entendido!" abajo para finalizar el tutorial.',
      side: "top",
      align: "center",
    },
  },
];

export function TutorialDriver({
  autoStart = false,
  onComplete,
  isFirstTime = false,
}) {
  const [showWelcome, setShowWelcome] = useState(isFirstTime && autoStart);
  const [showStartTutorial, setShowStartTutorial] = useState(false);
  const [driverInstance, setDriverInstance] = useState(null);

  useEffect(() => {
    console.log(
      "🎬 [TutorialDriver] useEffect - autoStart:",
      autoStart,
      "isFirstTime:",
      isFirstTime
    );

    if (!autoStart) {
      console.log("   ❌ No autoStart, saliendo");
      return;
    }

    if (isFirstTime) {
      console.log("   ✅ Es primera vez, mostrando bienvenida");
      // Mostrar bienvenida primero
      setShowWelcome(true);
    } else {
      console.log("   ✅ NO es primera vez, iniciando tutorial directamente");
      // No es primera vez: iniciar tutorial directamente sin modales
      startTutorial();
    }
  }, [autoStart, isFirstTime]);

  const startTutorial = () => {
    console.log("🚀 [TutorialDriver] startTutorial - iniciando driver.js");
    setShowWelcome(false);
    setShowStartTutorial(false);

    // Si hay modales abiertos, esperar a que se cierren
    const hasModals = showWelcome || showStartTutorial;
    const delay = hasModals ? 300 : 0;

    console.log(`   Delay: ${delay}ms (modales abiertos: ${hasModals})`);

    setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        showButtons: ["next", "previous"],
        steps: TUTORIAL_STEPS,
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "¡Entendido!",
        progressText: "{{current}} de {{total}}",
        onNextClick: (element, step, options) => {
          const currentStep = driverObj.getActiveIndex();
          const totalSteps = TUTORIAL_STEPS.length;

          if (currentStep === totalSteps - 1) {
            // Último paso: el botón "¡Entendido!" cierra y completa
            driverObj.destroy();
            if (onComplete) {
              onComplete();
            }
          } else {
            // Pasos intermedios: siguiente paso normal
            driverObj.moveNext();
          }
        },
        onDestroyStarted: () => {
          // Prevenir cierre con X o clic fuera
          const currentStep = driverObj.getActiveIndex();
          const totalSteps = TUTORIAL_STEPS.length;

          // Solo permitir si es desde el botón "¡Entendido!" (último paso)
          // De lo contrario, bloquear
          if (currentStep !== totalSteps - 1) {
            return false;
          }
        },
        onDestroyed: () => {
          console.log("🔚 [TutorialDriver] onDestroyed - tutorial cerrado");
          // Llamar onComplete para resetear estado
          if (onComplete) {
            console.log("   → Llamando onComplete");
            onComplete();
          }
        },
        popoverClass: "tutorial-popover",
        overlayColor: "rgba(0, 0, 0, 0.75)",
        allowClose: false,
        disableActiveInteraction: true,
      });

      setDriverInstance(driverObj);
      driverObj.drive();
    }, delay);
  };

  const handleWelcomeContinue = () => {
    setShowWelcome(false);
    setShowStartTutorial(true);
  };

  const handleSkipToSurveys = () => {
    setShowWelcome(false);
    setShowStartTutorial(false);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <>
      {/* Modal de Bienvenida */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <PartyPopper className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  ¡Bienvenido a Guazú!
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  Estamos emocionados de tenerte aquí. Guazú es tu herramienta
                  para realizar encuestas de manera profesional y eficiente.
                </p>

                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  Te guiaremos paso a paso para que conozcas todas las
                  funcionalidades de la plataforma.
                </p>

                <button
                  onClick={handleWelcomeContinue}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Comenzar Tutorial */}
      <AnimatePresence>
        {showStartTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <PlayCircle className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Tutorial Interactivo
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  Te mostraremos cómo usar la plataforma en solo unos minutos.
                  Este tutorial es obligatorio para todos los nuevos
                  encuestadores.
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                  Aprenderás a navegar, responder encuestas y usar las
                  funcionalidades offline.
                </p>

                <button
                  onClick={startTutorial}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Comenzar Tutorial
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
