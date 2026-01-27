"use client";

import { GripVertical, Folder, Copy, Trash2, ChevronDown, Plus } from 'lucide-react';
import QuestionCard from './QuestionCard';
import ConditionalEditor from './ConditionalEditor';

export default function ModuleCard({
  modulo,
  moduloIdx,
  expandidaModulos,
  arrastrando,
  handleDragStart,
  handleDragOver,
  handleDropModulo,
  handleDropPregunta,
  renombrarModulo,
  actualizarDescripcionModulo,
  setExpandidaModulos,
  setModuloDinamizandose,
  setModuloCondicionandose,
  eliminarModulo,
  setModulos,
  modulos,
  agregarPregunta,
  tiposPreguntas,
  generarValue,
  actualizarPregunta,
  eliminarPregunta,
  setArrastrando,
  onEditQuestion,
  // Props para condicionales de módulo
  actualizarModulo,
  preguntasDisponiblesModulo = []
}) {
  const isExpanded = expandidaModulos[modulo.id];

  return (
    <div
      draggable={!isExpanded}
      onDragStart={(e) => {
        if (!isExpanded) {
          handleDragStart(e, 'modulo', { index: moduloIdx });
        }
      }}
      onDragEnd={() => {
        setArrastrando(null);
      }}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDropModulo(e, moduloIdx)}
      className={`bg-[color:var(--card-background)] rounded-lg border-2 overflow-hidden transition-all ${
        arrastrando?.tipo === 'modulo' && arrastrando?.datos.index === moduloIdx
          ? 'opacity-50 border-dashed border-[color:var(--primary)]'
          : 'border-[color:var(--card-border)] hover:border-[color:var(--primary)]'
      }`}
    >
      <div
        className={`w-full bg-[color:var(--hover-bg)] hover:bg-[color:var(--primary)]/10 transition-colors ${
          !isExpanded ? 'cursor-move' : 'cursor-pointer'
        }`}
      >
        {/* Primera fila: nombre, descripción y botones */}
        <div
          onClick={(e) => {
            // Solo expandir/colapsar si no se clickeó en un botón
            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
              const isExpanding = !isExpanded;
              setExpandidaModulos({ ...expandidaModulos, [modulo.id]: isExpanding });
              if (isExpanding) {
                setModuloDinamizandose(null);
                setModuloCondicionandose(null);
              }
            }
          }}
          className="px-4 py-3 flex flex-wrap items-start gap-3"
        >
          <GripVertical 
            size={16} 
            className={`flex-shrink-0 mt-1 transition-opacity ${
              !isExpanded 
                ? 'text-[color:var(--text-muted)] opacity-100' 
                : 'text-[color:var(--text-muted)] opacity-30'
            }`} 
          />
          <Folder size={16} className="text-[color:var(--primary)] flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0 md:min-w-[200px]">
            <input
              type="text"
              value={modulo.nombre}
              onChange={(e) => renombrarModulo(modulo.id, e.target.value)}
              className="w-full bg-transparent text-[color:var(--text-primary)] font-semibold outline-none hover:underline text-sm mb-1"
              placeholder="Nombre del módulo"
            />
            <textarea
              value={modulo.descripcion || ''}
              onChange={(e) => actualizarDescripcionModulo(modulo.id, e.target.value)}
              placeholder="Descripción del módulo (opcional)"
              rows={1}
              className="w-full bg-transparent text-xs text-[color:var(--text-secondary)] placeholder-[color:var(--text-muted)] outline-none border-none focus:ring-0 resize-none overflow-hidden leading-relaxed"
              style={{
                minHeight: '1rem',
                height: 'auto'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>
          <span className="text-xs text-[color:var(--text-secondary)] flex-shrink-0 mt-1">{modulo.preguntas.length}</span>
          
          {/* Botones - solo visible en desktop */}
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const copia = {
                  ...modulo,
                  id: Date.now(),
                  nombre: `Copia de ${modulo.nombre}`,
                  descripcion: modulo.descripcion || '',
                  preguntas: modulo.preguntas.map(p => ({ ...p, id: Date.now() + Math.random() })),
                  condicionada: modulo.condicionada || { activa: false, condiciones: [] },
                  dinamico: modulo.dinamico || { activo: false, panelCount: 1, minPanelCount: 0, maxPanelCount: 10, panelAddText: 'Agregar', panelRemoveText: 'Eliminar' }
                };
                setModulos([...modulos, copia]);
                setModuloCondicionandose(null);
                setModuloDinamizandose(null);
              }}
              className="p-1 text-[color:var(--text-secondary)] hover:text-[color:var(--primary)] transition-colors"
              title="Clonar módulo"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                eliminarModulo(modulo.id);
              }}
              className="p-1 text-[color:var(--text-secondary)] hover:text-red-500 transition-colors"
              title="Eliminar módulo"
            >
              <Trash2 size={14} />
            </button>
            <ChevronDown
              size={18}
              className={`text-[color:var(--text-secondary)] transition-transform flex-shrink-0 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Fila mobile: Condicionales + Botones */}
        <div className="md:hidden px-4 pb-2 flex items-center justify-between gap-2">
          {/* ConditionalEditor */}
          {preguntasDisponiblesModulo.length > 0 && (
            <div className="flex-shrink-0">
              <ConditionalEditor
                condicionada={modulo.condicionada || { activa: false, condiciones: [] }}
                preguntasDisponibles={preguntasDisponiblesModulo}
                onUpdate={(nuevaCondicionada) => actualizarModulo && actualizarModulo(modulo.id, { condicionada: nuevaCondicionada })}
                label="Módulo condicional"
              />
            </div>
          )}
          
          {/* Botones */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const copia = {
                  ...modulo,
                  id: Date.now(),
                  nombre: `Copia de ${modulo.nombre}`,
                  descripcion: modulo.descripcion || '',
                  preguntas: modulo.preguntas.map(p => ({ ...p, id: Date.now() + Math.random() })),
                  condicionada: modulo.condicionada || { activa: false, condiciones: [] },
                  dinamico: modulo.dinamico || { activo: false, panelCount: 1, minPanelCount: 0, maxPanelCount: 10, panelAddText: 'Agregar', panelRemoveText: 'Eliminar' }
                };
                setModulos([...modulos, copia]);
                setModuloCondicionandose(null);
                setModuloDinamizandose(null);
              }}
              className="p-1 text-[color:var(--text-secondary)] hover:text-[color:var(--primary)] transition-colors"
              title="Clonar módulo"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                eliminarModulo(modulo.id);
              }}
              className="p-1 text-[color:var(--text-secondary)] hover:text-red-500 transition-colors"
              title="Eliminar módulo"
            >
              <Trash2 size={14} />
            </button>
            <ChevronDown
              size={18}
              className={`text-[color:var(--text-secondary)] transition-transform flex-shrink-0 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* ConditionalEditor - solo visible en desktop */}
        {preguntasDisponiblesModulo.length > 0 && (
          <div className="hidden md:block px-4 pb-2">
            <ConditionalEditor
              condicionada={modulo.condicionada || { activa: false, condiciones: [] }}
              preguntasDisponibles={preguntasDisponiblesModulo}
              onUpdate={(nuevaCondicionada) => actualizarModulo && actualizarModulo(modulo.id, { condicionada: nuevaCondicionada })}
              label="Módulo condicional"
            />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {modulo.preguntas.length === 0 ? (
            <p className="text-center text-[color:var(--text-muted)] text-xs py-3">No hay preguntas</p>
          ) : (
            <div className="space-y-2">
              {modulo.preguntas.map((pregunta, idx) => (
                <QuestionCard
                  key={pregunta.id}
                  pregunta={pregunta}
                  idx={idx}
                  modulo={modulo}
                  arrastrando={arrastrando}
                  handleDragStart={handleDragStart}
                  handleDragOver={handleDragOver}
                  handleDropPregunta={handleDropPregunta}
                  generarValue={generarValue}
                  eliminarPregunta={eliminarPregunta}
                  setArrastrando={setArrastrando}
                  tiposPreguntas={tiposPreguntas}
                  onEdit={() => onEditQuestion(modulo.id, pregunta.id)}
                />
              ))}
            </div>
          )}

          {arrastrando?.tipo === 'pregunta' && (
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (handleDropPregunta) {
                  handleDropPregunta(e, modulo.id, modulo.preguntas.length);
                }
              }}
              className="h-12 border-2 border-dashed border-[color:var(--primary)] rounded-lg flex items-center justify-center text-[color:var(--primary)] text-xs font-medium bg-[color:var(--primary)]/5 hover:bg-[color:var(--primary)]/10 transition-colors"
            >
              Soltar pregunta aquí
            </div>
          )}

          <button
            onClick={() => agregarPregunta(modulo.id)}
            className="w-full py-2 rounded border-2 border-dashed border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:text-[color:var(--primary)] hover:border-[color:var(--primary)] text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Agregar pregunta
          </button>
        </div>
      )}
    </div>
  );
}

