"use client";

import { GripVertical, Trash2, Edit2, Filter } from 'lucide-react';

export default function QuestionCard({
  pregunta,
  idx,
  modulo,
  arrastrando,
  handleDragStart,
  handleDragOver,
  handleDropPregunta,
  generarValue,
  eliminarPregunta,
  setArrastrando,
  tiposPreguntas,
  onEdit
}) {
  const expandKey = `pregunta-${pregunta.id}`;
  const tipoActual = tiposPreguntas.find(t => t.value === pregunta.tipo);
  const Icon = tipoActual?.icon;
  
  // Calcular cantidad de opciones según el tipo
  const getDetallesTipo = () => {
    const tiposConOpciones = ['opcion-unica', 'opcion-multiple', 'desplegable', 'ordenar', 'escala'];
    const tiposConMatriz = ['matriz', 'matriz-multiple', 'matriz-dinamica'];
    
    if (tiposConOpciones.includes(pregunta.tipo) && pregunta.opciones?.length > 0) {
      const cantidad = pregunta.opciones.length;
      return `${cantidad} ${cantidad === 1 ? 'opción' : 'opciones'}`;
    }
    
    if (tiposConMatriz.includes(pregunta.tipo)) {
      const filas = pregunta.filas?.length || 0;
      const columnas = pregunta.columnas?.length || 0;
      if (filas && columnas) {
        return `${filas}x${columnas}`;
      }
    }
    
    if (pregunta.tipo === 'texto-multiple' && pregunta.opciones?.length > 0) {
      return `${pregunta.opciones.length} campos`;
    }
    
    return null;
  };
  
  const detalles = getDetallesTipo();

  return (
    <div
      draggable
      onDragStart={(e) => {
        handleDragStart(e, 'pregunta', { moduloId: modulo.id, index: idx });
      }}
      onDragEnd={() => {
        setArrastrando(null);
      }}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (handleDropPregunta) {
          handleDropPregunta(e, modulo.id, idx);
        }
      }}
      data-pregunta-card={expandKey}
      className={`bg-[color:var(--hover-bg)] rounded border-2 transition-all cursor-move ${
        arrastrando?.tipo === 'pregunta' && arrastrando?.datos.moduloId === modulo.id && arrastrando?.datos.index === idx
          ? 'opacity-50 border-dashed border-[color:var(--primary)]'
          : 'border-[color:var(--card-border)] hover:border-[color:var(--primary)]'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        <GripVertical 
          size={14} 
          className="text-[color:var(--text-muted)] flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5">
            <span className="text-[color:var(--text-primary)] font-semibold text-sm flex-shrink-0">{idx + 1}</span>
            <span className="text-[color:var(--text-primary)] text-sm">-</span>
            <p className="text-[color:var(--text-primary)] text-sm flex-1 line-clamp-2">
              {pregunta.text || <span className="text-[color:var(--text-muted)] italic">Sin texto</span>}
            </p>
          </div>
          <div className="pl-6 flex items-center gap-2">
            <span className="text-xs text-[color:var(--text-secondary)] lowercase">
              {tipoActual?.label || 'sin tipo'}
              {detalles && ` - ${detalles}`}
            </span>
            {pregunta.condicionada?.activa && pregunta.condicionada.condiciones?.length > 0 && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[color:var(--tag-question-bg)] text-[color:var(--tag-question-text)]">
                pregunta condicional
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-600/10 rounded-lg transition-colors"
            title="Editar pregunta"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              eliminarPregunta(modulo.id, pregunta.id);
            }}
            className="p-2 text-[color:var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Eliminar pregunta"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

