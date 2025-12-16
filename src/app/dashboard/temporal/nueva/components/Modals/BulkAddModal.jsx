"use client";

import { X, Upload, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BulkAddModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Carga rápida de opciones",
  placeholder = "Ingresa una opción por línea...\n\nEjemplo:\nBuena\nMala\nRegular"
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [texto, setTexto] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTexto('');
      setShowPreview(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const procesarTexto = () => {
    const lineas = texto
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    return lineas.map((text, index) => ({
      value: String(index + 1),
      text: text
    }));
  };

  const opcionesPreview = procesarTexto();

  const handleConfirm = () => {
    if (opcionesPreview.length === 0) return;
    onConfirm(opcionesPreview);
    onClose();
  };

  const handlePaste = (e) => {
    // Permitir el pegado normal
    setTimeout(() => {
      setShowPreview(true);
    }, 100);
  };

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center p-4 z-[150] transition-all duration-200 ${
        isAnimating ? 'bg-opacity-70' : 'bg-opacity-0'
      }`}
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`bg-[color:var(--card-background)] rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col border border-[color:var(--card-border)] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[color:var(--card-border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Panel de entrada */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
                  Texto (una opción por línea)
                </label>

              <textarea
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                }}
                onPaste={handlePaste}
                placeholder={placeholder}
                rows={12}
                className="w-full px-3 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:outline-none text-sm transition-all resize-none font-mono"
                autoFocus
              />
              <p className="text-xs text-[color:var(--text-muted)]">
                💡 Pega aquí tu lista de opciones. Cada línea será una opción.
              </p>
            </div>

            {/* Panel de preview */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
                Vista previa ({opcionesPreview.length} {opcionesPreview.length === 1 ? 'opción' : 'opciones'})
              </label>
              <div className="border border-[color:var(--card-border)] rounded-lg bg-[color:var(--hover-bg)] p-3 h-[calc(12*1.5rem+2rem)] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {opcionesPreview.length > 0 ? (
                    <div className="space-y-2">
                      {opcionesPreview.map((opcion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-2 p-2 rounded bg-[color:var(--card-background)] border border-[color:var(--card-border)]"
                        >
                          <span className="w-8 text-center text-xs font-mono bg-[color:var(--primary)] text-white px-2 py-0.5 rounded">
                            {opcion.value}
                          </span>
                          <span className="flex-1 text-sm text-[color:var(--text-primary)]">
                            {opcion.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[color:var(--text-muted)] text-sm">
                      {texto.length === 0 
                        ? 'Escribe o pega texto para ver el preview'
                        : 'No hay opciones válidas (líneas vacías serán ignoradas)'
                      }
                    </div>
                  )}
                </AnimatePresence>
              </div>
              {opcionesPreview.length > 0 && opcionesPreview.length < 2 && (
                <p className="text-xs text-orange-600">
                  ⚠️ Se requieren al menos 2 opciones
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--card-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)] font-medium transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={opcionesPreview.length === 0}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[color:var(--primary)] hover:opacity-90 text-white font-medium transition-opacity text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={16} />
            Agregar {opcionesPreview.length > 0 ? `${opcionesPreview.length} opciones` : 'opciones'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}



