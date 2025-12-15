"use client";

import { Plus, Trash2, GripVertical, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

export default function OptionsEditor({ 
  opciones = [], 
  onUpdate, 
  onBulkAdd,
  label = "Opciones",
  allowReorder = true
}) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [editingValueIndex, setEditingValueIndex] = useState(null);
  const lastInputRef = useRef(null);

  useEffect(() => {
    if (lastInputRef.current) {
      lastInputRef.current.focus();
    }
  }, [opciones.length]);

  const agregarOpcion = () => {
    const nuevoIndex = opciones.length + 1;
    const nuevaOpcion = {
      value: String(nuevoIndex),
      text: ''
    };
    onUpdate([...opciones, nuevaOpcion]);
  };

  const eliminarOpcion = (index) => {
    const nuevasOpciones = opciones.filter((_, i) => i !== index);
    // Opcional: renumerar automáticamente
    const renumeradas = nuevasOpciones.map((opt, i) => ({
      ...opt,
      value: String(i + 1)
    }));
    onUpdate(renumeradas);
  };

  const actualizarOpcion = (index, campo, valor) => {
    const nuevasOpciones = [...opciones];
    nuevasOpciones[index] = {
      ...nuevasOpciones[index],
      [campo]: valor
    };
    onUpdate(nuevasOpciones);
  };

  const handleDragStart = (e, index) => {
    if (!allowReorder) return;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (!allowReorder || draggingIndex === null) return;
    e.preventDefault();
    
    if (draggingIndex !== index) {
      const nuevasOpciones = [...opciones];
      const [draggedItem] = nuevasOpciones.splice(draggingIndex, 1);
      nuevasOpciones.splice(index, 0, draggedItem);
      
      // Renumerar automáticamente después de reordenar
      const renumeradas = nuevasOpciones.map((opt, i) => ({
        ...opt,
        value: String(i + 1)
      }));
      
      onUpdate(renumeradas);
      setDraggingIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarOpcion();
    }
  };

  return (
    <div className="space-y-3">
      {/* Header con botones */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
          {label}
        </span>
        <div className="flex gap-2">
          {onBulkAdd && (
            <button
              type="button"
              onClick={onBulkAdd}
              className="px-2 py-1 text-xs rounded-lg border border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] transition-colors flex items-center gap-1"
            >
              <Zap size={12} />
              Carga rápida
            </button>
          )}
          <button
            type="button"
            onClick={agregarOpcion}
            className="px-2 py-1 text-xs rounded-lg bg-[color:var(--primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-1"
          >
            <Plus size={12} />
            Agregar
          </button>
        </div>
      </div>

      {/* Lista de opciones */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {opciones.map((opcion, index) => (
            <motion.div
              key={`${index}-${opcion.value}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              draggable={allowReorder}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-background)] transition-all ${
                draggingIndex === index ? 'opacity-50' : ''
              } ${allowReorder ? 'cursor-move' : ''}`}
            >
              {/* Drag handle */}
              {allowReorder && (
                <div className="text-[color:var(--text-muted)] cursor-grab active:cursor-grabbing">
                  <GripVertical size={16} />
                </div>
              )}

              {/* Variable (value) */}
              <div className="relative">
                {editingValueIndex === index ? (
                  <input
                    type="text"
                    value={opcion.value}
                    onChange={(e) => actualizarOpcion(index, 'value', e.target.value)}
                    onBlur={() => setEditingValueIndex(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingValueIndex(null);
                    }}
                    className="w-12 px-2 py-1 text-xs text-center rounded bg-[color:var(--input-background)] border border-[color:var(--primary)] text-[color:var(--text-primary)] font-mono focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingValueIndex(index)}
                    className="w-12 px-2 py-1 text-xs text-center rounded bg-[color:var(--hover-bg)] text-[color:var(--text-secondary)] font-mono hover:bg-[color:var(--primary)] hover:text-white transition-colors"
                    title="Clic para editar variable"
                  >
                    {opcion.value}
                  </button>
                )}
              </div>

              {/* Texto de la opción */}
              <input
                ref={index === opciones.length - 1 ? lastInputRef : null}
                type="text"
                value={opcion.text}
                onChange={(e) => actualizarOpcion(index, 'text', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={`Opción ${index + 1}`}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
              />

              {/* Botón eliminar */}
              <button
                type="button"
                onClick={() => eliminarOpcion(index)}
                className="p-1.5 text-[color:var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                title="Eliminar opción"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mensaje si no hay opciones */}
      {opciones.length === 0 && (
        <div className="text-center py-8 text-[color:var(--text-muted)] text-sm border-2 border-dashed border-[color:var(--card-border)] rounded-lg">
          No hay opciones. Haz clic en "Agregar" para crear una.
        </div>
      )}

      {/* Info sobre mínimo de opciones */}
      {opciones.length > 0 && opciones.length < 2 && (
        <p className="text-xs text-orange-600">
          Se requieren al menos 2 opciones para este tipo de pregunta.
        </p>
      )}
    </div>
  );
}

