"use client";

import { Plus, Trash2, ShieldCheck } from 'lucide-react';

const OPERADORES = [
  { value: '>=', label: 'Mayor o igual que (≥)' },
  { value: '>', label: 'Mayor que (>)' },
  { value: '<=', label: 'Menor o igual que (≤)' },
  { value: '<', label: 'Menor que (<)' },
  { value: '=', label: 'Igual a (=)' },
  { value: '!=', label: 'Distinto de (≠)' },
];

const crearReglaBase = () => ({
  id: Date.now() + Math.random(),
  tipo: 'rango',
  min: '',
  max: '',
  operador: '<=',
  compararConTipo: 'valor',
  compararConValor: '',
  compararConPreguntaId: '',
  mensaje: '',
});

export default function ValidatorsEditor({
  validadores = { activo: false, reglas: [] },
  preguntasNumericas = [],
  onUpdate,
}) {
  const activo = validadores.activo || false;
  const reglas = validadores.reglas || [];

  const update = (changes) => onUpdate({ ...validadores, ...changes });

  const toggleActivo = () => {
    if (activo) {
      update({ activo: false, reglas: [] });
    } else {
      update({ activo: true, reglas: [crearReglaBase()] });
    }
  };

  const agregarRegla = () => {
    update({ reglas: [...reglas, crearReglaBase()] });
  };

  const eliminarRegla = (id) => {
    const nuevas = reglas.filter((r) => r.id !== id);
    update({ reglas: nuevas, activo: nuevas.length > 0 ? activo : false });
  };

  const actualizarRegla = (id, campo, valor) => {
    update({
      reglas: reglas.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)),
    });
  };

  const labelOperador = (op) => {
    const found = OPERADORES.find((o) => o.value === op);
    return found ? found.label : op;
  };

  return (
    <div className="space-y-3">
      {/* Header con toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[color:var(--text-secondary)]" />
          <span className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
            Validadores
          </span>
        </div>
        <button
          type="button"
          onClick={toggleActivo}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            activo ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--card-border)]'
          }`}
          aria-label="Activar validadores"
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              activo ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Reglas */}
      {activo && (
        <div className="space-y-3">
          {reglas.map((regla) => (
            <div
              key={regla.id}
              className="bg-[color:var(--hover-bg)] border border-[color:var(--card-border)] rounded-lg p-3 space-y-3"
            >
              {/* Tipo de regla + botón eliminar */}
              <div className="flex items-center gap-2">
                <select
                  value={regla.tipo}
                  onChange={(e) => actualizarRegla(regla.id, 'tipo', e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none"
                >
                  <option value="rango">Rango numérico (mínimo / máximo)</option>
                  <option value="comparacion">Comparación con valor u otra pregunta</option>
                </select>
                <button
                  type="button"
                  onClick={() => eliminarRegla(regla.id)}
                  className="p-1.5 text-[color:var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  title="Eliminar regla"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Configuración según tipo */}
              {regla.tipo === 'rango' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[color:var(--text-secondary)] mb-1">
                      Mínimo
                    </label>
                    <input
                      type="number"
                      value={regla.min}
                      onChange={(e) => actualizarRegla(regla.id, 'min', e.target.value)}
                      placeholder="Sin límite"
                      className="w-full px-2 py-1.5 text-sm rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[color:var(--text-secondary)] mb-1">
                      Máximo
                    </label>
                    <input
                      type="number"
                      value={regla.max}
                      onChange={(e) => actualizarRegla(regla.id, 'max', e.target.value)}
                      placeholder="Sin límite"
                      className="w-full px-2 py-1.5 text-sm rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {regla.tipo === 'comparacion' && (
                <div className="space-y-2">
                  {/* Operador */}
                  <div>
                    <label className="block text-xs text-[color:var(--text-secondary)] mb-1">
                      El valor ingresado debe ser
                    </label>
                    <select
                      value={regla.operador}
                      onChange={(e) => actualizarRegla(regla.id, 'operador', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none"
                    >
                      {OPERADORES.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo de comparación: valor fijo vs otra pregunta */}
                  <div className="flex rounded-lg border border-[color:var(--card-border)] overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => actualizarRegla(regla.id, 'compararConTipo', 'valor')}
                      className={`flex-1 py-1.5 font-medium transition-colors ${
                        regla.compararConTipo === 'valor'
                          ? 'bg-[color:var(--primary)] text-white'
                          : 'bg-[color:var(--input-background)] text-[color:var(--text-secondary)] hover:bg-[color:var(--hover-bg)]'
                      }`}
                    >
                      Valor fijo
                    </button>
                    <button
                      type="button"
                      onClick={() => actualizarRegla(regla.id, 'compararConTipo', 'pregunta')}
                      className={`flex-1 py-1.5 font-medium transition-colors ${
                        regla.compararConTipo === 'pregunta'
                          ? 'bg-[color:var(--primary)] text-white'
                          : 'bg-[color:var(--input-background)] text-[color:var(--text-secondary)] hover:bg-[color:var(--hover-bg)]'
                      }`}
                    >
                      Otra pregunta
                    </button>
                  </div>

                  {/* Input según tipo */}
                  {regla.compararConTipo === 'valor' ? (
                    <input
                      type="number"
                      value={regla.compararConValor}
                      onChange={(e) => actualizarRegla(regla.id, 'compararConValor', e.target.value)}
                      placeholder="Ej: 18"
                      className="w-full px-2 py-1.5 text-sm rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none"
                    />
                  ) : (
                    <select
                      value={regla.compararConPreguntaId}
                      onChange={(e) => actualizarRegla(regla.id, 'compararConPreguntaId', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none"
                    >
                      <option value="">— Seleccionar pregunta —</option>
                      {preguntasNumericas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.numeroDisplay ? `${p.numeroDisplay}. ` : ''}{p.text || p.value || `Pregunta ${p.id}`}
                          {p.value ? ` (${p.value})` : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Vista previa de la expresión */}
                  {(regla.compararConTipo === 'valor' && regla.compararConValor !== '') ||
                  (regla.compararConTipo === 'pregunta' && regla.compararConPreguntaId) ? (
                    <p className="text-xs text-[color:var(--text-muted)] font-mono bg-[color:var(--card-background)] rounded px-2 py-1 border border-[color:var(--card-border)]">
                      Validación: respuesta {labelOperador(regla.operador)}{' '}
                      {regla.compararConTipo === 'valor'
                        ? regla.compararConValor
                        : preguntasNumericas.find((p) => p.id === regla.compararConPreguntaId)
                            ?.text ||
                          preguntasNumericas.find((p) => p.id === regla.compararConPreguntaId)
                            ?.value ||
                          '...'}
                    </p>
                  ) : null}
                </div>
              )}

              {/* Mensaje de error personalizado */}
              <div>
                <label className="block text-xs text-[color:var(--text-secondary)] mb-1">
                  Mensaje de error (opcional)
                </label>
                <input
                  type="text"
                  value={regla.mensaje}
                  onChange={(e) => actualizarRegla(regla.id, 'mensaje', e.target.value)}
                  placeholder="Ej: El valor debe ser mayor a 18"
                  className="w-full px-2 py-1.5 text-sm rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none"
                />
              </div>
            </div>
          ))}

          {/* Botón agregar regla */}
          <button
            type="button"
            onClick={agregarRegla}
            className="w-full py-2 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-all group"
          >
            <Plus size={14} className="group-hover:text-[color:var(--primary)] transition-colors" />
            <span className="text-sm font-medium">Agregar regla</span>
          </button>
        </div>
      )}
    </div>
  );
}
