"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";

export function ObserveCaseModal({
  isOpen,
  onClose,
  onConfirm,
  surveyTitle,
  isLoading = false,
}) {
  const [observation, setObservation] = useState("");

  const handleConfirm = async () => {
    if (observation.trim()) {
      await onConfirm(observation.trim());
      setObservation(""); // Limpiar el campo después de confirmar
    }
  };

  const handleClose = () => {
    setObservation("");
    onClose();
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
          <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-[var(--card-background)] rounded-t-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Observar Caso
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
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

            <div className="mb-4">
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
              onClick={handleConfirm}
              disabled={isLoading || !observation.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
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




