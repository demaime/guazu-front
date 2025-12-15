"use client";

import { Plus, Trash2, GripVertical, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

export default function MatrixEditor({ 
  filas = [], 
  columnas = [],
  onUpdateFilas,
  onUpdateColumnas,
  onBulkAddFilas,
  onBulkAddColumnas,
  tipoMatriz = 'matriz', // 'matriz' | 'matriz-multiple' | 'matriz-dinamica'
  allowReorder = true
}) {
  const [draggingFilaIndex, setDraggingFilaIndex] = useState(null);
  const [draggingColumnaIndex, setDraggingColumnaIndex] = useState(null);
  const [editingFilaValueIndex, setEditingFilaValueIndex] = useState(null);
  const [editingColumnaValueIndex, setEditingColumnaValueIndex] = useState(null);
  const lastFilaInputRef = useRef(null);
  const lastColumnaInputRef = useRef(null);

  useEffect(() => {
    if (lastFilaInputRef.current) {
      lastFilaInputRef.current.focus();
    }
  }, [filas.length]);

  useEffect(() => {
    if (lastColumnaInputRef.current) {
      lastColumnaInputRef.current.focus();
    }
  }, [columnas.length]);

  // Funciones para FILAS
  const agregarFila = () => {
    const nuevoIndex = filas.length + 1;
    const nuevaFila = {
      value: String(nuevoIndex),
      text: ''
    };
    onUpdateFilas([...filas, nuevaFila]);
  };

  const eliminarFila = (index) => {
    const nuevasFilas = filas.filter((_, i) => i !== index);
    const renumeradas = nuevasFilas.map((fila, i) => ({
      ...fila,
      value: String(i + 1)
    }));
    onUpdateFilas(renumeradas);
  };

  const actualizarFila = (index, campo, valor) => {
    const nuevasFilas = [...filas];
    nuevasFilas[index] = {
      ...nuevasFilas[index],
      [campo]: valor
    };
    onUpdateFilas(nuevasFilas);
  };

  const handleFilaDragStart = (e, index) => {
    if (!allowReorder) return;
    setDraggingFilaIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFilaDragOver = (e, index) => {
    if (!allowReorder || draggingFilaIndex === null) return;
    e.preventDefault();
    
    if (draggingFilaIndex !== index) {
      const nuevasFilas = [...filas];
      const [draggedItem] = nuevasFilas.splice(draggingFilaIndex, 1);
      nuevasFilas.splice(index, 0, draggedItem);
      
      const renumeradas = nuevasFilas.map((fila, i) => ({
        ...fila,
        value: String(i + 1)
      }));
      
      onUpdateFilas(renumeradas);
      setDraggingFilaIndex(index);
    }
  };

  const handleFilaDragEnd = () => {
    setDraggingFilaIndex(null);
  };

  // Funciones para COLUMNAS
  const agregarColumna = () => {
    const nuevoIndex = columnas.length + 1;
    const nuevaColumna = {
      value: String(nuevoIndex),
      text: '',
      ...(tipoMatriz === 'matriz-dinamica' && { cellType: 'text' })
    };
    onUpdateColumnas([...columnas, nuevaColumna]);
  };

  const eliminarColumna = (index) => {
    const nuevasColumnas = columnas.filter((_, i) => i !== index);
    const renumeradas = nuevasColumnas.map((col, i) => ({
      ...col,
      value: String(i + 1)
    }));
    onUpdateColumnas(renumeradas);
  };

  const actualizarColumna = (index, campo, valor) => {
    const nuevasColumnas = [...columnas];
    nuevasColumnas[index] = {
      ...nuevasColumnas[index],
      [campo]: valor
    };
    onUpdateColumnas(nuevasColumnas);
  };

  const handleColumnaDragStart = (e, index) => {
    if (!allowReorder) return;
    setDraggingColumnaIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnaDragOver = (e, index) => {
    if (!allowReorder || draggingColumnaIndex === null) return;
    e.preventDefault();
    
    if (draggingColumnaIndex !== index) {
      const nuevasColumnas = [...columnas];
      const [draggedItem] = nuevasColumnas.splice(draggingColumnaIndex, 1);
      nuevasColumnas.splice(index, 0, draggedItem);
      
      const renumeradas = nuevasColumnas.map((col, i) => ({
        ...col,
        value: String(i + 1)
      }));
      
      onUpdateColumnas(renumeradas);
      setDraggingColumnaIndex(index);
    }
  };

  const handleColumnaDragEnd = () => {
    setDraggingColumnaIndex(null);
  };

  const handleKeyDown = (e, tipo) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tipo === 'fila') {
        agregarFila();
      } else {
        agregarColumna();
      }
    }
  };

  const renderFilaItem = (fila, index) => (
    <motion.div
      key={`fila-${index}-${fila.value}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      draggable={allowReorder}
      onDragStart={(e) => handleFilaDragStart(e, index)}
      onDragOver={(e) => handleFilaDragOver(e, index)}
      onDragEnd={handleFilaDragEnd}
      className={`flex items-center gap-2 p-2 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-background)] transition-all ${
        draggingFilaIndex === index ? 'opacity-50' : ''
      } ${allowReorder ? 'cursor-move' : ''}`}
    >
      {allowReorder && (
        <div className="text-[color:var(--text-muted)] cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </div>
      )}

      <div className="relative">
        {editingFilaValueIndex === index ? (
          <input
            type="text"
            value={fila.value}
            onChange={(e) => actualizarFila(index, 'value', e.target.value)}
            onBlur={() => setEditingFilaValueIndex(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingFilaValueIndex(null);
            }}
            className="w-12 px-2 py-1 text-xs text-center rounded bg-[color:var(--input-background)] border border-[color:var(--primary)] text-[color:var(--text-primary)] font-mono focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingFilaValueIndex(index)}
            className="w-12 px-2 py-1 text-xs text-center rounded bg-[color:var(--hover-bg)] text-[color:var(--text-secondary)] font-mono hover:bg-[color:var(--primary)] hover:text-white transition-colors"
            title="Clic para editar variable"
          >
            {fila.value}
          </button>
        )}
      </div>

      <input
        ref={index === filas.length - 1 ? lastFilaInputRef : null}
        type="text"
        value={fila.text}
        onChange={(e) => actualizarFila(index, 'text', e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, 'fila')}
        placeholder={`Fila ${index + 1}`}
        className="flex-1 px-3 py-1.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
      />

      <button
        type="button"
        onClick={() => eliminarFila(index)}
        className="p-1.5 text-[color:var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        title="Eliminar fila"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );

  const renderColumnaItem = (columna, index) => (
    <motion.div
      key={`columna-${index}-${columna.value}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      draggable={allowReorder}
      onDragStart={(e) => handleColumnaDragStart(e, index)}
      onDragOver={(e) => handleColumnaDragOver(e, index)}
      onDragEnd={handleColumnaDragEnd}
      className={`flex items-center gap-2 p-2 rounded-lg border border-[color:var(--card-border)] bg-[color:var(--card-background)] transition-all ${
        draggingColumnaIndex === index ? 'opacity-50' : ''
      } ${allowReorder ? 'cursor-move' : ''}`}
    >
      {allowReorder && (
        <div className="text-[color:var(--text-muted)] cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </div>
      )}

      <div className="relative">
        {editingColumnaValueIndex === index ? (
          <input
            type="text"
            value={columna.value}
            onChange={(e) => actualizarColumna(index, 'value', e.target.value)}
            onBlur={() => setEditingColumnaValueIndex(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingColumnaValueIndex(null);
            }}
            className="w-12 px-2 py-1 text-xs text-center rounded bg-[color:var(--input-background)] border border-[color:var(--primary)] text-[color:var(--text-primary)] font-mono focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingColumnaValueIndex(index)}
            className="w-12 px-2 py-1 text-xs text-center rounded bg-[color:var(--hover-bg)] text-[color:var(--text-secondary)] font-mono hover:bg-[color:var(--primary)] hover:text-white transition-colors"
            title="Clic para editar variable"
          >
            {columna.value}
          </button>
        )}
      </div>

      <input
        ref={index === columnas.length - 1 ? lastColumnaInputRef : null}
        type="text"
        value={columna.text}
        onChange={(e) => actualizarColumna(index, 'text', e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, 'columna')}
        placeholder={`Columna ${index + 1}`}
        className="flex-1 px-3 py-1.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
      />

      {tipoMatriz === 'matriz-dinamica' && (
        <select
          value={columna.cellType || 'text'}
          onChange={(e) => actualizarColumna(index, 'cellType', e.target.value)}
          className="px-2 py-1.5 text-xs rounded bg-[color:var(--input-background)] border border-[color:var(--card-border)] text-[color:var(--text-primary)] focus:border-[color:var(--primary)] focus:outline-none"
        >
          <option value="text">Texto</option>
          <option value="dropdown">Desplegable</option>
          <option value="checkbox">Checkbox</option>
        </select>
      )}

      <button
        type="button"
        onClick={() => eliminarColumna(index)}
        className="p-1.5 text-[color:var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        title="Eliminar columna"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Sección FILAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
            Filas
          </span>
          <div className="flex gap-2">
            {onBulkAddFilas && (
              <button
                type="button"
                onClick={onBulkAddFilas}
                className="px-2 py-1 text-xs rounded-lg border border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] transition-colors flex items-center gap-1"
              >
                <Zap size={12} />
                Carga rápida
              </button>
            )}
            <button
              type="button"
              onClick={agregarFila}
              className="px-2 py-1 text-xs rounded-lg bg-[color:var(--primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <Plus size={12} />
              Agregar
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filas.map((fila, index) => renderFilaItem(fila, index))}
          </AnimatePresence>
        </div>

        {filas.length === 0 && (
          <div className="text-center py-6 text-[color:var(--text-muted)] text-sm border-2 border-dashed border-[color:var(--card-border)] rounded-lg">
            No hay filas. Haz clic en "Agregar" para crear una.
          </div>
        )}
      </div>

      {/* Sección COLUMNAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
            Columnas
          </span>
          <div className="flex gap-2">
            {onBulkAddColumnas && (
              <button
                type="button"
                onClick={onBulkAddColumnas}
                className="px-2 py-1 text-xs rounded-lg border border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] transition-colors flex items-center gap-1"
              >
                <Zap size={12} />
                Carga rápida
              </button>
            )}
            <button
              type="button"
              onClick={agregarColumna}
              className="px-2 py-1 text-xs rounded-lg bg-[color:var(--primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <Plus size={12} />
              Agregar
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {columnas.map((columna, index) => renderColumnaItem(columna, index))}
          </AnimatePresence>
        </div>

        {columnas.length === 0 && (
          <div className="text-center py-6 text-[color:var(--text-muted)] text-sm border-2 border-dashed border-[color:var(--card-border)] rounded-lg">
            No hay columnas. Haz clic en "Agregar" para crear una.
          </div>
        )}
      </div>

      {/* Validación */}
      {(filas.length > 0 && filas.length < 2) || (columnas.length > 0 && columnas.length < 2) ? (
        <p className="text-xs text-orange-600">
          Se requieren al menos 2 filas y 2 columnas para una matriz.
        </p>
      ) : null}
    </div>
  );
}

