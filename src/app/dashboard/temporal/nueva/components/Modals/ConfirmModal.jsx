"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Estás seguro?",
  message = "Esta acción no se puede deshacer.",
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  icon: Icon = AlertTriangle,
  iconColor = "red",
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[150] transition-all duration-200 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-[color:var(--card-background)] rounded-lg p-6 max-w-lg w-full border border-[color:var(--card-border)] shadow-2xl transition-all duration-200 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2 rounded-lg ${
              iconColor === "primary"
                ? "bg-[color:var(--primary)]/10"
                : iconColor === "warning"
                  ? "bg-transparent"
                  : "bg-red-500/10"
            }`}
          >
            <Icon
              size={24}
              className={
                iconColor === "primary"
                  ? "text-[color:var(--primary)]"
                  : iconColor === "warning"
                    ? "text-[color:var(--warning)]"
                    : "text-red-500"
              }
            />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-1">
              {title}
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)] whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        <div className={`flex gap-3 ${!cancelText ? "justify-end" : ""}`}>
          {cancelText && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)] font-medium transition-colors text-sm"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`${cancelText ? "flex-1" : "px-6"} px-4 py-2 rounded-lg ${
              iconColor === "warning"
                ? "bg-[color:var(--primary)] hover:bg-[color:var(--primary)]/90"
                : "bg-red-500 hover:bg-red-600"
            } text-white font-medium transition-colors text-sm`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
