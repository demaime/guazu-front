"use client";

import { Plus, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

export default function MultiTextFieldsEditor({ 
  campos = [],
  onUpdate,
  allowReorder = true
}) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [editingValueIndex, setEditingValueIndex] = useState(null);
  const lastInputRef = useRef(null);

  useEffect(() => {
    if (lastInputRef.current) {
      lastInputRef.current.focus();
    }
  }, [campos.length]);

  const agregarCampo = () => {
    const nuevoIndex = campos.length + 1;
    const nuevoCampo = {
      value: `campo${nuevoIndex}`,
      label: '',
      tipo: 'text'
    };
    onUpdate([...campos, nuevoCampo]);
  };

  const eliminarCampo = (index) => {
    const nuevosCampos = campos.filter((_, i) => i !== index);
    onUpdate(nuevosCampos);
  };

  const actualizarCampo = (index, campo, valor) => {
    const nuevosCampos = [...campos];
    nuevosCampos[index] = {
      ...nuevosCampos[index],
      [campo]: valor
    };
    onUpdate(nuevosCampos);
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
      const nuevosCampos = [...campos];
      const [draggedItem] = nuevosCampos.splice(draggingIndex, 1);
      nuevosCampos.splice(index, 0, draggedItem);
      
      onUpdate(nuevosCampos);
      setDraggingIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarCampo();
    }
  };

  const tiposCampo = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Teléfono' },
    { value: 'date', label: 'Fecha' },
    { value: 'textarea', label: 'Texto largo' }
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
          Campos del formulario
        </span>
      </div>

      {/* Encabezados */}
      {campos.length > 0 && (
        <div className="flex items-center gap-2 px-2 pb-1 text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
          {allowReorder && <div className="w-4 text-center" title="Orden">#</div>}
          <div className="w-20 text-center">Variable</div>
          <div className="flex-1">Etiqueta</div>
          <div className="w-24">Tipo</div>
          <div className="w-7"></div>
        </div>
      )}

      {/* Lista de campos */}
      <div className="space-y-2">
        <div className="max-h-96 overflow-y-auto pr-1 space-y-2">
          <AnimatePresence mode="popLayout">
            {campos.map((campo, index) => (
              <motion.div
                key={`${index}-${campo.value}`}
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
                  <div className="text-[color:var(--text-muted)] cursor-grab active:cursor-grabbing w-4 flex justify-center">
                    <GripVertical size={16} />
                  </div>
                )}

                {/* Variable (value) */}
                <div className="relative w-20">
                  {editingValueIndex === index ? (
                    <input
                      type="text"
                      value={campo.value}
                      onChange={(e) => actualizarCampo(index, 'value', e.target.value)}
                      onBlur={() => setEditingValueIndex(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingValueIndex(null);
                      }}
                      className="w-full px-2 py-1 text-xs text-center rounded bg-[color:var(--input-background)] border border-[color:var(--primary)] text-[color:var(--text-primary)] font-mono focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingValueIndex(index)}
                      className="w-full px-2 py-1 text-xs text-center rounded bg-[color:var(--hover-bg)] text-[color:var(--text-secondary)] font-mono hover:bg-[color:var(--primary)] hover:text-white transition-colors truncate"
                      title={campo.value}
                    >
                      {campo.value}
                    </button>
                  )}
                </div>

                {/* Label del campo */}
                <input
                  ref={index === campos.length - 1 ? lastInputRef : null}
                  type="text"
                  value={campo.label}
                  onChange={(e) => actualizarCampo(index, 'label', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Etiqueta"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all min-w-0"
                />

                {/* Tipo de campo */}
                <div className="w-24">
                  <select
                    value={campo.tipo || 'text'}
                    onChange={(e) => actualizarCampo(index, 'tipo', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-xs transition-all"
                  >
                    {tiposCampo.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botón eliminar */}
                <button
                  type="button"
                  onClick={() => eliminarCampo(index)}
                  className="p-1.5 text-[color:var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 w-7 flex justify-center"
                  title="Eliminar campo"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Botón agregar campo */}
        <button
          type="button"
          onClick={agregarCampo}
          className="w-full py-2 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-all group"
        >
          <Plus size={16} className="text-[color:var(--text-muted)] group-hover:text-[color:var(--primary)] transition-colors" />
          <span className="text-sm font-medium">Agregar campo</span>
        </button>
      </div>

      {/* Mensaje si no hay campos */}
      {campos.length === 0 && (
        <div className="text-center py-8 text-[color:var(--text-muted)] text-sm border-2 border-dashed border-[color:var(--card-border)] rounded-lg">
          No hay campos definidos. Haz clic en "Agregar campo" para crear uno.
        </div>
      )}

      {/* Info sobre mínimo de campos */}
      {campos.length > 0 && campos.length < 1 && (
        <p className="text-xs text-orange-600">
          Se requiere al menos 1 campo para este tipo de pregunta.
        </p>
      )}

      {/* Preview */}
      {campos.length > 0 && (
        <div className="mt-4 p-3 bg-[color:var(--hover-bg)] rounded-lg border border-[color:var(--card-border)]">
          <p className="text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
            Vista previa
          </p>
          <div className="space-y-2">
            {campos.map((campo, index) => (
              <div key={index} className="text-xs">
                <span className="text-[color:var(--text-primary)] font-medium">
                  {campo.label || `Campo ${index + 1}`}
                </span>
                <span className="text-[color:var(--text-muted)] ml-2">
                  ({tiposCampo.find(t => t.value === campo.tipo)?.label || 'Texto'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



