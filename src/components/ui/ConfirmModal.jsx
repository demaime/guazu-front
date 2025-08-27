import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  showCancelButton = true,
  isLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4 bg-[var(--background)]">
            <div className="text-[var(--text-secondary)] leading-relaxed">
              {children}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-[var(--card-border)] bg-[var(--card-background)] rounded-b-xl">
            {showCancelButton && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-md bg-[var(--input-background)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
