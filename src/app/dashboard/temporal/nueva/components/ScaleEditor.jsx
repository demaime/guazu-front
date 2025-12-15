"use client";

import { useState } from 'react';

export default function ScaleEditor({ 
  configuracion = {},
  onUpdate
}) {
  const [modo, setModo] = useState(configuracion.modo || 'predefinida');
  
  const escalasPredifinidas = [
    {
      id: 'satisfaccion_5',
      nombre: 'Satisfacción (5 puntos)',
      puntos: 5,
      extremoIzquierdo: 'Muy insatisfecho',
      extremoDerecho: 'Muy satisfecho',
      opciones: [
        { value: '1', text: 'Muy insatisfecho' },
        { value: '2', text: 'Insatisfecho' },
        { value: '3', text: 'Neutral' },
        { value: '4', text: 'Satisfecho' },
        { value: '5', text: 'Muy satisfecho' }
      ]
    },
    {
      id: 'calidad_5',
      nombre: 'Calidad (5 puntos)',
      puntos: 5,
      extremoIzquierdo: 'Muy mala',
      extremoDerecho: 'Muy buena',
      opciones: [
        { value: '1', text: 'Muy mala' },
        { value: '2', text: 'Mala' },
        { value: '3', text: 'Regular' },
        { value: '4', text: 'Buena' },
        { value: '5', text: 'Muy buena' }
      ]
    },
    {
      id: 'acuerdo_5',
      nombre: 'Acuerdo (5 puntos)',
      puntos: 5,
      extremoIzquierdo: 'Totalmente en desacuerdo',
      extremoDerecho: 'Totalmente de acuerdo',
      opciones: [
        { value: '1', text: 'Totalmente en desacuerdo' },
        { value: '2', text: 'En desacuerdo' },
        { value: '3', text: 'Neutral' },
        { value: '4', text: 'De acuerdo' },
        { value: '5', text: 'Totalmente de acuerdo' }
      ]
    },
    {
      id: 'frecuencia_5',
      nombre: 'Frecuencia (5 puntos)',
      puntos: 5,
      extremoIzquierdo: 'Nunca',
      extremoDerecho: 'Siempre',
      opciones: [
        { value: '1', text: 'Nunca' },
        { value: '2', text: 'Raramente' },
        { value: '3', text: 'Ocasionalmente' },
        { value: '4', text: 'Frecuentemente' },
        { value: '5', text: 'Siempre' }
      ]
    },
    {
      id: 'numerica_10',
      nombre: 'Numérica (1-10)',
      puntos: 10,
      extremoIzquierdo: '1 - Mínimo',
      extremoDerecho: '10 - Máximo',
      opciones: Array.from({ length: 10 }, (_, i) => ({
        value: String(i + 1),
        text: String(i + 1)
      }))
    }
  ];

  const escalaSeleccionada = escalasPredifinidas.find(e => e.id === configuracion.escalaPredefinida) || escalasPredifinidas[0];
  const puntosPersonalizado = configuracion.puntos || 5;
  const extremoIzq = configuracion.extremoIzquierdo || 'Mínimo';
  const extremoDer = configuracion.extremoDerecho || 'Máximo';

  const handleModoChange = (nuevoModo) => {
    setModo(nuevoModo);
    if (nuevoModo === 'predefinida') {
      const escala = escalasPredifinidas[0];
      onUpdate({
        modo: 'predefinida',
        escalaPredefinida: escala.id,
        opciones: escala.opciones,
        puntos: escala.puntos,
        extremoIzquierdo: escala.extremoIzquierdo,
        extremoDerecho: escala.extremoDerecho
      });
    } else {
      // Generar opciones personalizadas
      const opciones = Array.from({ length: puntosPersonalizado }, (_, i) => ({
        value: String(i + 1),
        text: String(i + 1)
      }));
      onUpdate({
        modo: 'personalizada',
        opciones,
        puntos: puntosPersonalizado,
        extremoIzquierdo: extremoIzq,
        extremoDerecho: extremoDer
      });
    }
  };

  const handleEscalaPredefinidaChange = (escalaId) => {
    const escala = escalasPredifinidas.find(e => e.id === escalaId);
    if (escala) {
      onUpdate({
        modo: 'predefinida',
        escalaPredefinida: escala.id,
        opciones: escala.opciones,
        puntos: escala.puntos,
        extremoIzquierdo: escala.extremoIzquierdo,
        extremoDerecho: escala.extremoDerecho
      });
    }
  };

  const handlePersonalizadaChange = (campo, valor) => {
    const nuevosPuntos = campo === 'puntos' ? parseInt(valor) || 3 : puntosPersonalizado;
    const nuevoExtremoIzq = campo === 'extremoIzquierdo' ? valor : extremoIzq;
    const nuevoExtremoDer = campo === 'extremoDerecho' ? valor : extremoDer;
    
    const opciones = Array.from({ length: nuevosPuntos }, (_, i) => ({
      value: String(i + 1),
      text: String(i + 1)
    }));
    
    onUpdate({
      modo: 'personalizada',
      opciones,
      puntos: nuevosPuntos,
      extremoIzquierdo: nuevoExtremoIzq,
      extremoDerecho: nuevoExtremoDer
    });
  };

  return (
    <div className="space-y-4">
      {/* Selector de modo */}
      <div>
        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
          Tipo de escala
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModoChange('predefinida')}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              modo === 'predefinida'
                ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
                : 'border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)]'
            }`}
          >
            Predefinida
          </button>
          <button
            type="button"
            onClick={() => handleModoChange('personalizada')}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              modo === 'personalizada'
                ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
                : 'border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)]'
            }`}
          >
            Personalizada
          </button>
        </div>
      </div>

      {/* Configuración según modo */}
      {modo === 'predefinida' ? (
        <div>
          <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
            Seleccionar escala
          </label>
          <select
            value={configuracion.escalaPredefinida || escalasPredifinidas[0].id}
            onChange={(e) => handleEscalaPredefinidaChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
          >
            {escalasPredifinidas.map(escala => (
              <option key={escala.id} value={escala.id}>
                {escala.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Número de puntos
            </label>
            <select
              value={puntosPersonalizado}
              onChange={(e) => handlePersonalizadaChange('puntos', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
            >
              {[3, 4, 5, 7, 10].map(n => (
                <option key={n} value={n}>{n} puntos</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Extremo izquierdo (valor mínimo)
            </label>
            <input
              type="text"
              value={extremoIzq}
              onChange={(e) => handlePersonalizadaChange('extremoIzquierdo', e.target.value)}
              placeholder="Ej: Muy mala, Nunca, Totalmente en desacuerdo"
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Extremo derecho (valor máximo)
            </label>
            <input
              type="text"
              value={extremoDer}
              onChange={(e) => handlePersonalizadaChange('extremoDerecho', e.target.value)}
              placeholder="Ej: Muy buena, Siempre, Totalmente de acuerdo"
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
            />
          </div>
        </div>
      )}

      {/* Vista previa */}
      <div className="p-4 bg-[color:var(--hover-bg)] rounded-lg border border-[color:var(--card-border)]">
        <p className="text-xs font-semibold text-[color:var(--text-secondary)] mb-3 uppercase tracking-wide">
          Vista previa
        </p>
        <div className="space-y-3">
          {/* Extremos */}
          <div className="flex justify-between text-xs text-[color:var(--text-secondary)]">
            <span>{modo === 'predefinida' ? escalaSeleccionada.extremoIzquierdo : extremoIzq}</span>
            <span>{modo === 'predefinida' ? escalaSeleccionada.extremoDerecho : extremoDer}</span>
          </div>
          
          {/* Escala visual */}
          <div className="flex gap-1">
            {(modo === 'predefinida' ? escalaSeleccionada.opciones : configuracion.opciones || []).map((opcion, index) => (
              <div
                key={opcion.value}
                className="flex-1 aspect-square flex items-center justify-center rounded-lg border-2 border-[color:var(--card-border)] bg-[color:var(--card-background)] text-[color:var(--text-primary)] text-xs font-medium hover:border-[color:var(--primary)] transition-colors"
                title={opcion.text}
              >
                {opcion.value}
              </div>
            ))}
          </div>

          {/* Lista de opciones */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {(modo === 'predefinida' ? escalaSeleccionada.opciones : configuracion.opciones || []).map((opcion) => (
              <div key={opcion.value} className="flex items-center gap-2 text-xs">
                <span className="font-mono bg-[color:var(--primary)] text-white px-2 py-0.5 rounded">
                  {opcion.value}
                </span>
                <span className="text-[color:var(--text-primary)]">
                  {opcion.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

