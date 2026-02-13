"use client";

import { useState } from 'react';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Settings,
  X
} from 'lucide-react';

/**
 * Editor de condiciones compacto para preguntas y módulos.
 * Muestra un toggle inline y abre un modal para configurar.
 */
export default function ConditionalEditor({
  condicionada = { activa: false, condiciones: [] },
  preguntasDisponibles = [],
  onUpdate,
  label = "Módulo condicional"
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [expandida, setExpandida] = useState(null);

  // Operadores disponibles para single choice (radiogroup, dropdown)
  const operadoresSingleChoice = [
    { value: 'igual', label: 'es igual a' },
    { value: 'diferente', label: 'es diferente de' }
  ];

  // Operadores para multiple choice (checkbox)
  const operadoresMultipleChoice = [
    { value: 'contiene-alguna', label: 'contiene alguna de estas' },
    { value: 'contiene-todas', label: 'contiene todas estas' },
    { value: 'no-contiene-ninguna', label: 'no contiene ninguna de estas' },
    { value: 'igual', label: 'es exactamente igual a' }
  ];

  const operadoresNumericos = [
    { value: 'igual', label: 'es igual a' },
    { value: 'diferente', label: 'es diferente de' },
    { value: 'mayor', label: 'es mayor que' },
    { value: 'menor', label: 'es menor que' },
    { value: 'entre', label: 'está entre' }
  ];

  const condiciones = condicionada.condiciones || [];
  const cantidadCondiciones = condiciones.length;

  // Obtener operadores según tipo de pregunta
  const getOperadoresParaPregunta = (preguntaId) => {
    const pregunta = getPreguntaById(preguntaId);
    if (!pregunta) return operadoresSingleChoice;

    // Tipos numéricos
    const tiposNumericos = ['number', 'rating'];
    if (tiposNumericos.includes(pregunta.type)) {
      return operadoresNumericos;
    }

    // Multiple choice (checkbox) - tiene operadores especiales
    if (pregunta.type === 'checkbox' || pregunta.tipo === 'opcion-multiple') {
      return operadoresMultipleChoice;
    }

    // Single choice (radiogroup, dropdown, etc.)
    const tiposSingleChoice = ['radiogroup', 'dropdown', 'boolean', 'imagepicker'];
    if (tiposSingleChoice.includes(pregunta.type) || pregunta.tipo === 'opcion-unica' || pregunta.tipo === 'desplegable') {
      return operadoresSingleChoice;
    }

    // Por defecto, operadores de single choice
    return operadoresSingleChoice;
  };

  const toggleActiva = () => {
    onUpdate({
      ...condicionada,
      activa: !condicionada.activa
    });
  };

  const agregarCondicion = () => {
    // Determinar operador por defecto según el tipo de pregunta
    const primeraPregunta = preguntasDisponibles[0];
    let operadorPorDefecto = 'igual';
    
    if (primeraPregunta) {
      const operadoresDisponibles = getOperadoresParaPregunta(primeraPregunta.id);
      // Usar el primer operador disponible como default
      operadorPorDefecto = operadoresDisponibles[0]?.value || 'igual';
    }
    
    const nuevaCondicion = {
      id: Date.now(),
      tipo: 'mostrar',
      preguntaId: primeraPregunta?.id || null,
      operador: operadorPorDefecto,
      valores: [],
      valorMin: '',
      valorMax: ''
    };
    
    onUpdate({
      ...condicionada,
      activa: true,
      condiciones: [...condiciones, nuevaCondicion]
    });
    setExpandida(nuevaCondicion.id);
  };

  const actualizarCondicion = (condicionId, updates) => {
    const nuevasCondiciones = condiciones.map(c =>
      c.id === condicionId ? { ...c, ...updates } : c
    );
    onUpdate({
      ...condicionada,
      condiciones: nuevasCondiciones
    });
  };

  const eliminarCondicion = (condicionId) => {
    const nuevasCondiciones = condiciones.filter(c => c.id !== condicionId);
    onUpdate({
      ...condicionada,
      condiciones: nuevasCondiciones,
      activa: nuevasCondiciones.length > 0
    });
  };

  const toggleValor = (condicionId, valor) => {
    const condicion = condiciones.find(c => c.id === condicionId);
    if (!condicion) return;

    const valores = condicion.valores || [];
    const nuevosValores = valores.includes(valor)
      ? valores.filter(v => v !== valor)
      : [...valores, valor];
    
    actualizarCondicion(condicionId, { valores: nuevosValores });
  };

  const getPreguntaById = (id) => preguntasDisponibles.find(p => String(p.id) === String(id));

  const getResumenCondicion = (condicion) => {
    const pregunta = getPreguntaById(condicion.preguntaId);
    if (!pregunta) return 'Seleccionar pregunta...';

    const operadoresDisponibles = getOperadoresParaPregunta(condicion.preguntaId);
    const operadorObj = operadoresDisponibles.find(o => o.value === condicion.operador);
    const operadorLabel = operadorObj?.label || condicion.operador;
    
    if (condicion.operador === 'entre') {
      return `"${pregunta.text?.substring(0, 25)}..." ${operadorLabel} ${condicion.valorMin} y ${condicion.valorMax}`;
    }
    
    if (condicion.valores && condicion.valores.length > 0) {
      const valoresTexto = condicion.valores.map(v => {
        const opcion = pregunta.opciones?.find(o => o.value === v);
        return opcion?.text?.substring(0, 12) || v;
      }).join(', ');
      
      // Mostrar mejor resumen según el operador
      let prefijo = '';
      if (condicion.operador === 'contiene-todas') {
        prefijo = 'TODAS: ';
      } else if (condicion.operador === 'no-contiene-ninguna') {
        prefijo = 'NINGUNA: ';
      } else if (condicion.operador === 'contiene-alguna') {
        prefijo = 'ALGUNA: ';
      }
      
      return `"${pregunta.text?.substring(0, 20)}..." → ${prefijo}${valoresTexto}`;
    }
    
    return `"${pregunta.text?.substring(0, 25)}..." ${operadorLabel} ...`;
  };

  // Vista compacta inline
  return (
    <>
      <div className="flex items-center gap-2 py-1">
        {/* Label como tag */}
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors ${
          label.includes('Módulo')
            ? condicionada.activa
              ? 'bg-[color:var(--tag-module-bg)] text-[color:var(--tag-module-text)]'
              : 'bg-transparent text-[color:var(--text-muted)] border border-[color:var(--card-border)]'
            : condicionada.activa
              ? 'bg-[color:var(--tag-question-bg)] text-[color:var(--tag-question-text)]'
              : 'bg-transparent text-[color:var(--text-muted)] border border-[color:var(--card-border)]'
        }`}>
          {label}
        </span>
        
        {/* Toggle segundo */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={condicionada.activa}
            onChange={toggleActiva}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-[color:var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[color:var(--primary)]"></div>
        </label>
        
        {/* Botón configurar con contador - aparece cuando está activo */}
        {condicionada.activa && (
          <button
            onClick={() => setModalOpen(true)}
            className="p-0 text-[color:var(--text-secondary)] hover:text-[color:var(--primary)] transition-colors flex items-center gap-1"
            title="Configurar condiciones"
          >
            <Settings size={16} />
            {cantidadCondiciones > 0 && (
              <span className="text-xs text-[color:var(--text-secondary)]">
                ({cantidadCondiciones} condici{cantidadCondiciones === 1 ? 'ón' : 'ones'})
              </span>
            )}
          </button>
        )}
      </div>

      {/* Modal de configuración */}
      {modalOpen && (
        <div 
          className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[100]"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-[color:var(--card-background)] rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col border border-[color:var(--card-border)] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="px-4 py-3 border-b border-[color:var(--card-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch size={18} className="text-[color:var(--primary)]" />
                <h3 className="text-base font-semibold text-[color:var(--text-primary)]">
                  Configurar condiciones
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cantidadCondiciones === 0 && (
                <p className="text-sm text-[color:var(--text-secondary)] text-center py-4">
                  No hay condiciones configuradas. Agrega una para empezar.
                </p>
              )}

              {/* Selector de lógica (solo si hay más de una condición) */}
              {cantidadCondiciones > 1 && (
                <div className="bg-[color:var(--hover-bg)] rounded-lg p-3 border border-[color:var(--card-border)]">
                  <label className="block text-xs text-[color:var(--text-secondary)] mb-2 font-medium">
                    Combinar condiciones con:
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onUpdate({ ...condicionada, logica: 'and' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        (condicionada.logica || 'and') === 'and'
                          ? 'bg-[color:var(--primary)] text-white'
                          : 'bg-[color:var(--background)] text-[color:var(--text-secondary)] hover:bg-[color:var(--card-border)]'
                      }`}
                    >
                      Y (todas deben cumplirse)
                    </button>
                    <button
                      onClick={() => onUpdate({ ...condicionada, logica: 'or' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        condicionada.logica === 'or'
                          ? 'bg-[color:var(--primary)] text-white'
                          : 'bg-[color:var(--background)] text-[color:var(--text-secondary)] hover:bg-[color:var(--card-border)]'
                      }`}
                    >
                      O (al menos una)
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de condiciones */}
              {condiciones.map((condicion, idx) => {
                const preguntaSeleccionada = getPreguntaById(condicion.preguntaId);
                const esExpandida = expandida === condicion.id;
                const necesitaRango = condicion.operador === 'entre';
                const necesitaValores = ['igual', 'diferente', 'contiene-alguna', 'contiene-todas', 'no-contiene-ninguna'].includes(condicion.operador);



                return (
                  <div 
                    key={`${condicion.id}-${condicion.preguntaId || 'no-pregunta'}`}
                    className="border border-[color:var(--card-border)] rounded-lg overflow-hidden bg-[color:var(--background)]"
                  >
                    {/* Resumen colapsado */}
                    <div 
                      className="px-3 py-2.5 cursor-pointer hover:bg-[color:var(--hover-bg)] transition-colors"
                      onClick={() => setExpandida(esExpandida ? null : condicion.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                            Condición {idx + 1}
                          </span>
                          {idx > 0 && (
                            <span className="text-xs text-[color:var(--text-secondary)] px-1.5 py-0.5 bg-[color:var(--hover-bg)] rounded font-medium uppercase">
                              {(condicionada.logica || 'and') === 'and' ? 'Y' : 'O'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarCondicion(condicion.id);
                            }}
                            className="p-1 text-[color:var(--text-secondary)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                          {esExpandida ? <ChevronUp size={16} className="text-[color:var(--text-secondary)]" /> : <ChevronDown size={16} className="text-[color:var(--text-secondary)]" />}
                        </div>
                      </div>
                    </div>

                    {/* Editor expandido */}
                    {esExpandida && (
                      <div className="px-3 pb-3 pt-2 space-y-3 border-t border-[color:var(--card-border)] bg-[color:var(--card-background)]">
                        {/* Selector de pregunta */}
                        <div>
                          <label className="block text-xs text-[color:var(--text-secondary)] mb-1.5 font-medium">
                            Cuando esta pregunta:
                          </label>
                          <select
                            value={condicion.preguntaId || ''}
                            onChange={(e) => {
                              const valorSelect = e.target.value;
                              // Buscar la pregunta para obtener su ID original (preservando tipo number/string)
                              const preguntaObj = preguntasDisponibles.find(p => String(p.id) === String(valorSelect));
                              const nuevaPreguntaId = preguntaObj ? preguntaObj.id : valorSelect;

                              const operadoresDisponibles = getOperadoresParaPregunta(nuevaPreguntaId);
                              const operadorActualValido = operadoresDisponibles.some(op => op.value === condicion.operador);
                              
                              actualizarCondicion(condicion.id, { 
                                preguntaId: nuevaPreguntaId,
                                operador: operadorActualValido ? condicion.operador : (operadoresDisponibles[0]?.value || 'igual'),
                                valores: [],
                                valorMin: '',
                                valorMax: ''
                              });
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm"
                          >
                            <option value="">Seleccionar pregunta...</option>
                            {preguntasDisponibles.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.text?.substring(0, 50) || 'Sin texto'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selector de operador */}
                        <div>
                          <label className="block text-xs text-[color:var(--text-secondary)] mb-1.5 font-medium">
                            Cumple la condición:
                          </label>
                          <select
                            value={condicion.operador}
                            onChange={(e) => actualizarCondicion(condicion.id, { 
                              operador: e.target.value,
                              valores: [],
                              valorMin: '',
                              valorMax: ''
                            })}
                            className="w-full px-3 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm"
                          >
                            {getOperadoresParaPregunta(condicion.preguntaId).map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector de valores (para preguntas con opciones) */}
                        {preguntaSeleccionada && 
                         Array.isArray(preguntaSeleccionada.opciones) && 
                         preguntaSeleccionada.opciones.length > 0 && 
                         necesitaValores && (
                          <div>
                            <label className="block text-xs text-[color:var(--text-secondary)] mb-1.5 font-medium">
                              {condicion.operador === 'contiene-todas' 
                                ? 'Todas estas opciones:' 
                                : condicion.operador === 'no-contiene-ninguna'
                                ? 'Ninguna de estas opciones:'
                                : 'Seleccione una o más opciones:'}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {preguntaSeleccionada.opciones.map((opcion, opcionIdx) => {
                                const valorOpcion = opcion.value || opcion.text || `opcion-${opcionIdx}`;
                                const seleccionado = condicion.valores?.includes(valorOpcion);
                                return (
                                  <button
                                    key={opcionIdx}
                                    onClick={() => toggleValor(condicion.id, valorOpcion)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                      seleccionado
                                        ? 'bg-[color:var(--primary)] text-white'
                                        : 'bg-[color:var(--hover-bg)] text-[color:var(--text-secondary)] hover:bg-[color:var(--card-border)]'
                                    }`}
                                  >
                                    {opcion.text || opcion.value || `Opción ${opcionIdx + 1}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Inputs de rango (para operador "entre") */}
                        {necesitaRango && (
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              value={condicion.valorMin}
                              onChange={(e) => actualizarCondicion(condicion.id, { valorMin: e.target.value })}
                              placeholder="Mín"
                              className="flex-1 px-3 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm"
                            />
                            <span className="text-[color:var(--text-secondary)] text-sm">y</span>
                            <input
                              type="number"
                              value={condicion.valorMax}
                              onChange={(e) => actualizarCondicion(condicion.id, { valorMax: e.target.value })}
                              placeholder="Máx"
                              className="flex-1 px-3 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm"
                            />
                          </div>
                        )}

                        {/* Input de valor numérico (para mayor/menor) */}
                        {['mayor', 'menor'].includes(condicion.operador) && (
                          <div>
                            <label className="block text-xs text-[color:var(--text-secondary)] mb-1.5 font-medium">
                              Valor:
                            </label>
                            <input
                              type="number"
                              value={condicion.valorMin}
                              onChange={(e) => actualizarCondicion(condicion.id, { valorMin: e.target.value })}
                              placeholder="Ingresa un valor"
                              className="w-full px-3 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Botón agregar condición */}
              <button
                onClick={agregarCondicion}
                className="w-full py-2.5 rounded-lg border-2 border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white font-medium transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {cantidadCondiciones === 0 ? 'Agregar condición' : 'Agregar otra condición'}
              </button>
            </div>

            {/* Footer del modal */}
            <div className="px-4 py-3 border-t border-[color:var(--card-border)]">
              <button
                onClick={() => setModalOpen(false)}
                className="w-full py-2.5 rounded-lg bg-[color:var(--primary)] hover:bg-[color:var(--primary-dark)] text-white font-medium transition-colors text-sm"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
