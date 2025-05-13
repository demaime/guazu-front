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
  confirmButtonClass = "bg-red-500 text-white hover:bg-red-600",
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
          className="absolute inset-0 bg-black/80"
        />

        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-[var(--background)] w-full max-w-md mx-4 rounded-lg shadow-xl border border-[var(--card-border)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-[var(--card-background)] rounded-t-lg">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 hover:bg-[var(--hover-bg)] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 bg-[var(--background)]">
            <div className="text-[var(--text-primary)]">{children}</div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-[var(--card-border)] bg-[var(--card-background)] rounded-b-lg">
            {showCancelButton && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 btn-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md ${confirmButtonClass} transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
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
