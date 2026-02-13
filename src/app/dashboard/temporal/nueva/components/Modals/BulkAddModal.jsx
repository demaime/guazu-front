"use client";

import { X, Upload, GripVertical, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileDetect } from '../../hooks/useMobileDetect';

export default function BulkAddModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Carga rápida de opciones",
  placeholder = "Ingresa una opción por línea...\n\nEjemplo:\nBuena\nMala\nRegular"
}) {
  // IMPORTANTE: Todos los hooks deben estar al inicio, antes de cualquier return condicional
  const isMobile = useMobileDetect();
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [texto, setTexto] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [opciones, setOpciones] = useState([]);
  const prevTextoRef = useRef('');
  
  // Estado para redimensionar paneles
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // porcentaje
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTexto('');
      setShowPreview(false);
      setOpciones([]);
      prevTextoRef.current = '';
      setLeftPanelWidth(50);
    }
  }, [isOpen]);

  // Procesar texto cuando cambia y actualizar opciones
  useEffect(() => {
    if (texto !== prevTextoRef.current) {
      const lineas = texto
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
      
      const nuevasOpciones = lineas.map((text, index) => {
        // Mantener el value personalizado si existe y el texto es el mismo
        const existente = opciones.find((op, i) => i === index && op.text === text);
        return {
          value: existente ? existente.value : String(index + 1),
          text: text
        };
      });
      
      setOpciones(nuevasOpciones);
      prevTextoRef.current = texto;
    }
  }, [texto]);

  // Handlers para redimensionar
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limitar entre 25% y 75%
    const clampedWidth = Math.min(Math.max(newWidth, 25), 75);
    setLeftPanelWidth(clampedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (opciones.length === 0) return;
    onConfirm(opciones);
    onClose();
  };

  const handlePaste = (e) => {
    // Permitir el pegado normal
    setTimeout(() => {
      setShowPreview(true);
    }, 100);
  };

  const handleValueChange = (index, newValue) => {
    setOpciones(prev => prev.map((op, i) => 
      i === index ? { ...op, value: newValue } : op
    ));
  };

  const handleTextChange = (index, newText) => {
    setOpciones(prev => prev.map((op, i) => 
      i === index ? { ...op, text: newText } : op
    ));
  };

  // Mobile: Full-screen vertical layout
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-[color:var(--background)] z-[150] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[color:var(--card-border)] bg-[color:var(--card-background)]">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 className="text-base font-semibold text-[color:var(--text-primary)]">{title}</h3>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Textarea de entrada */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
                Texto (una opción por línea)
              </label>

              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onPaste={handlePaste}
                placeholder={placeholder}
                rows={8}
                className="w-full px-3 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:outline-none text-base transition-all resize-none font-mono"
                autoFocus
              />
              <p className="text-xs text-[color:var(--text-muted)]">
                💡 Pega aquí tu lista de opciones. Cada línea será una opción.
              </p>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
                Vista previa ({opciones.length} {opciones.length === 1 ? 'opción' : 'opciones'})
              </label>
              
              <div className="border border-[color:var(--card-border)] rounded-lg bg-[color:var(--hover-bg)] overflow-hidden">
                {/* Encabezados */}
                <div className="flex items-center gap-2 px-3 py-2 bg-[color:var(--card-background)] border-b border-[color:var(--card-border)] text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
                  <span className="w-16 text-center">Variable</span>
                  <span className="flex-1">Texto</span>
                </div>
                
                <div className="p-3 max-h-96 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {opciones.length > 0 ? (
                      <div className="space-y-2">
                        {opciones.map((opcion, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center gap-2 p-2 rounded bg-[color:var(--card-background)] border border-[color:var(--card-border)]"
                          >
                            <input
                              type="text"
                              value={opcion.value}
                              onChange={(e) => handleValueChange(index, e.target.value)}
                              className="w-16 text-center text-sm font-mono bg-[color:var(--primary)] text-white px-2 py-1 rounded border-0 focus:ring-2 focus:ring-white/30 focus:outline-none"
                              title="Editar valor de variable"
                            />
                            <input
                              type="text"
                              value={opcion.text}
                              onChange={(e) => handleTextChange(index, e.target.value)}
                              className="flex-1 text-base text-[color:var(--text-primary)] bg-transparent border-0 outline-none focus:bg-[color:var(--hover-bg)] px-2 py-1 rounded transition-colors"
                              title="Editar texto de opción"
                            />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-[color:var(--text-muted)] text-sm text-center">
                        {texto.length === 0 
                          ? 'Escribe o pega texto para ver el preview'
                          : 'No hay opciones válidas (líneas vacías serán ignoradas)'
                        }
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {opciones.length > 0 && opciones.length < 2 && (
                <p className="text-xs text-orange-600">
                  ⚠️ Se requieren al menos 2 opciones
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[color:var(--card-border)] bg-[color:var(--card-background)] flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)] font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={opciones.length === 0}
              className="flex-1 px-4 py-3 rounded-lg bg-[color:var(--primary)] hover:opacity-90 text-white font-medium transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={16} />
              Agregar {opciones.length > 0 ? `${opciones.length}` : ''}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Desktop: Modal with resizable panels
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
        className={`bg-[color:var(--card-background)] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-[color:var(--card-border)] shadow-2xl ${isResizing ? 'select-none' : ''}`}
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
        <div className="flex-1 overflow-hidden p-4" style={{ minHeight: '400px' }}>
          <div 
            ref={containerRef}
            className="flex h-full gap-0"
          >
            {/* Panel de entrada */}
            <div 
              className="space-y-2 overflow-hidden flex flex-col"
              style={{ width: `${leftPanelWidth}%` }}
            >
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

            {/* Divisor redimensionable */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-3 flex-shrink-0 flex items-center justify-center cursor-col-resize group hover:bg-[color:var(--primary)]/10 transition-colors mx-1 rounded ${isResizing ? 'bg-[color:var(--primary)]/20' : ''}`}
            >
              <div className={`w-1 h-16 rounded-full transition-colors ${isResizing ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--card-border)] group-hover:bg-[color:var(--primary)]'}`} />
            </div>

            {/* Panel de preview */}
            <div 
              className="space-y-2 overflow-hidden flex flex-col"
              style={{ width: `${100 - leftPanelWidth}%` }}
            >
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
                Vista previa ({opciones.length} {opciones.length === 1 ? 'opción' : 'opciones'})
              </label>
              
              <div className="border border-[color:var(--card-border)] rounded-lg bg-[color:var(--hover-bg)] overflow-hidden h-[calc(12*1.5rem+2rem)]">
                {/* Encabezados de columna - siempre visibles */}
                <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--card-background)] border-b border-[color:var(--card-border)] text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
                  <span className="w-20 text-center">Variable</span>
                  <span className="flex-1">Texto</span>
                </div>
                
                <div className="p-3 overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
                  <AnimatePresence mode="popLayout">
                    {opciones.length > 0 ? (
                      <div className="space-y-2">
                        {opciones.map((opcion, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center gap-2 p-2 rounded bg-[color:var(--card-background)] border border-[color:var(--card-border)]"
                          >
                            <input
                              type="text"
                              value={opcion.value}
                              onChange={(e) => handleValueChange(index, e.target.value)}
                              className="w-20 text-center text-xs font-mono bg-[color:var(--primary)] text-white px-2 py-1 rounded border-0 focus:ring-2 focus:ring-white/30 focus:outline-none"
                              title="Editar valor de variable"
                            />
                            <input
                              type="text"
                              value={opcion.text}
                              onChange={(e) => handleTextChange(index, e.target.value)}
                              className="flex-1 text-sm text-[color:var(--text-primary)] bg-transparent border-0 outline-none focus:bg-[color:var(--hover-bg)] px-2 py-1 rounded transition-colors"
                              title="Editar texto de opción"
                            />
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
              </div>
              {opciones.length > 0 && opciones.length < 2 && (
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
            disabled={opciones.length === 0}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[color:var(--primary)] hover:opacity-90 text-white font-medium transition-opacity text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={16} />
            Agregar {opciones.length > 0 ? `${opciones.length} opciones` : 'opciones'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
