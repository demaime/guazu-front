"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2, GraduationCap, Check } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function ObserveCaseModal({
  isOpen,
  onClose,
  onConfirm,
  surveyTitle,
  isLoading = false,
  autoStartTutorial = false,
}) {
  const [observation, setObservation] = useState("");
  const [driverObj, setDriverObj] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Inicializar driver.js
  useEffect(() => {
    if (isOpen) {
      const driverInstance = driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Entendido",
        progressText: "{{current}} de {{total}}",
        steps: [
          {
            element: "#observe-modal-header",
            popover: {
              title: "Observar Caso",
              description:
                "Esta función te permite reportar casos que requieren atención especial de tu supervisor.",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "#observation-textarea",
            popover: {
              title: "Escribe tu observación",
              description:
                "Aquí puedes explicar por qué este caso debe ser revisado. Por ejemplo: si el encuestado no cumple los requisitos, si hay datos incorrectos, si necesita ser repetido, eliminado o cualquier otra situación especial.",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#observation-submit-btn",
            popover: {
              title: "Enviar al supervisor",
              description:
                "Una vez que hayas escrito tu observación, presiona este botón para marcar el caso como observado. Tu supervisor recibirá tu mensaje y tomará las acciones necesarias.",
              side: "top",
              align: "end",
            },
          },
        ],
      });

      setDriverObj(driverInstance);

      return () => {
        driverInstance.destroy();
      };
    }
  }, [isOpen]);

  // Auto-iniciar tutorial si viene desde el menú de tutoriales
  useEffect(() => {
    if (isOpen && autoStartTutorial && driverObj) {
      console.log("🎯 [ObserveCaseModal] Auto-iniciando tutorial desde menú de tutoriales");
      // Pequeño delay para asegurar que el modal esté completamente renderizado
      setTimeout(() => {
        driverObj.drive();
      }, 300);
    }
  }, [isOpen, autoStartTutorial, driverObj]);

  const handleStartTutorial = () => {
    if (driverObj) {
      driverObj.drive();
    }
  };

  const handleConfirm = async () => {
    if (observation.trim()) {
      await onConfirm(observation.trim());

      // Mostrar el check de éxito
      setShowSuccess(true);

      // Esperar 1 segundo antes de cerrar el modal
      setTimeout(() => {
        setShowSuccess(false);
        setObservation(""); // Limpiar el campo después de confirmar
        onClose();
      }, 1000);
    }
  };

  const handleClose = () => {
    if (!isLoading && !showSuccess) {
      setObservation("");
      setShowSuccess(false);
      if (driverObj) {
        driverObj.destroy();
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        />

        {/* Dialog */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full max-w-md mx-4 rounded-xl shadow-xl border border-[var(--card-border)] bg-[var(--background)]"
        >
          {/* Header */}
          <div
            id="observe-modal-header"
            className="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-[var(--card-background)] rounded-t-xl"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Observar Caso
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {/* Botón de ayuda */}
              <button
                onClick={handleStartTutorial}
                disabled={isLoading}
                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Ver tutorial"
              >
                <GraduationCap className="w-5 h-5 text-yellow-500 group-hover:text-yellow-600 transition-colors" />
              </button>
              {/* Botón de cerrar */}
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 bg-[var(--background)]">
            {surveyTitle && (
              <div className="mb-4 p-3 bg-[var(--input-background)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)]">
                  Encuesta:{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {surveyTitle}
                  </span>
                </p>
              </div>
            )}

            <div id="observation-textarea" className="mb-4">
              <label
                htmlFor="observation"
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
              >
                Motivo de la observación
              </label>
              <textarea
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                disabled={isLoading}
                placeholder="Describe el motivo por el cual este caso debe ser observado..."
                className="w-full p-3 border border-[var(--card-border)] bg-[var(--input-background)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                rows={4}
              />
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Este caso será marcado como observado y el supervisor podrá ver
                la razón.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-[var(--card-border)] bg-[var(--card-background)] rounded-b-xl">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              id="observation-submit-btn"
              onClick={handleConfirm}
              disabled={isLoading || !observation.trim() || showSuccess}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                showSuccess
                  ? "bg-green-500"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {showSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  ¡Listo!
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Observando...
                </>
              ) : (
                "Marcar como Observado"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
