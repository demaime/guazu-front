import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle } from "lucide-react";

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
  variant = "danger", // "danger" | "primary" | "warning"
  alertMessage = null, // Mensaje de alerta opcional
}) {
  if (!isOpen) return null;

  const variants = {
    danger: {
      button: "bg-red-600 hover:bg-red-700 text-white",
      alert: "bg-[color:var(--error-bg)] border-[color:var(--error-border)] text-[color:var(--error-text)]",
    },
    primary: {
      button: "bg-[color:var(--primary)] hover:opacity-90 text-white",
      alert: "bg-[color:var(--primary-light)]/10 border-[color:var(--primary)]/20 text-[color:var(--text-primary)]",
    },
    warning: {
      button: "bg-yellow-500 hover:bg-yellow-600 text-white",
      alert: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    },
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isLoading ? undefined : onClose}
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
            
            {/* Alert Message with theme support */}
            {alertMessage && (
              <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2 ${variants[variant].alert}`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-justify">
                  {alertMessage}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-[var(--card-border)] bg-[var(--card-background)] rounded-b-xl">
            {showCancelButton && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-md bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] hover:bg-[var(--error-border)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed font-medium ${variants[variant].button}`}
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
