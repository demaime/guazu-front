"use client";

import { useState, useEffect } from 'react';


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
  const extremoIzq = configuracion.extremoIzquierdo || '';
  const extremoDer = configuracion.extremoDerecho || '';

  // Initialize checks
  useEffect(() => {
    if (!configuracion.modo) {
        handleModoChange('predefinida');
    }
  }, []);

  const handleModoChange = (nuevoModo) => {
    setModo(nuevoModo);
    if (nuevoModo === 'predefinida') {
      const escala = escalasPredifinidas[0];
      onUpdate({
        ...configuracion,
        modo: 'predefinida',
        escalaPredefinida: escala.id,
        opciones: escala.opciones,
        puntos: escala.puntos,
        extremoIzquierdo: escala.extremoIzquierdo,
        extremoDerecho: escala.extremoDerecho
      });
    } else {
      // Initialize module with current config or defaults, but ensure options exist
      const currentPuntos = configuracion.puntos || 5;
      const opciones = Array.from({ length: currentPuntos }, (_, i) => ({
        value: String(i + 1),
        text: String(i + 1)
      }));
      
      onUpdate({
        ...configuracion,
        modo: 'personalizada',
        opciones,
        puntos: currentPuntos,
        extremoIzquierdo: configuracion.extremoIzquierdo || 'Mínimo',
        extremoDerecho: configuracion.extremoDerecho || 'Máximo'
      });
    }
  };

  const handleEscalaPredefinidaChange = (escalaId) => {
    const escala = escalasPredifinidas.find(e => e.id === escalaId);
    if (escala) {
      onUpdate({
        ...configuracion,
        modo: 'predefinida',
        escalaPredefinida: escala.id,
        opciones: escala.opciones,
        puntos: escala.puntos,
        extremoIzquierdo: escala.extremoIzquierdo,
        extremoDerecho: escala.extremoDerecho
      });
    }
  };

  const handlePuntosChange = (valor) => {
    const nuevosPuntos = Math.max(2, Math.min(100, parseInt(valor) || 2));
    
    // Regenerate options keeping existing texts if possible
    const oldOptions = configuracion.opciones || [];
    const nuevasOpciones = Array.from({ length: nuevosPuntos }, (_, i) => {
      // Try to keep existing options if they exist
      if (i < oldOptions.length) {
        return oldOptions[i];
      }
      return {
        value: String(i + 1),
        text: String(i + 1)
      };
    });

    onUpdate({
      ...configuracion,
      modo: 'personalizada',
      puntos: nuevosPuntos,
      opciones: nuevasOpciones
    });
  };

  const handleExtremoChange = (campo, valor) => {
    onUpdate({
      ...configuracion,
      [campo]: valor
    });
  };

  const handleOpcionTextChange = (index, nuevoTexto) => {
    const nuevasOpciones = [...(configuracion.opciones || [])];
    if (nuevasOpciones[index]) {
      nuevasOpciones[index] = { ...nuevasOpciones[index], text: nuevoTexto };
      onUpdate({
        ...configuracion,
        opciones: nuevasOpciones
      });
    }
  };

  const opcionesDisplay = modo === 'predefinida' ? escalaSeleccionada.opciones : (configuracion.opciones || []);
  const izquierdoDisplay = modo === 'predefinida' ? escalaSeleccionada.extremoIzquierdo : extremoIzq;
  const derechoDisplay = modo === 'predefinida' ? escalaSeleccionada.extremoDerecho : extremoDer;

  return (
    <div className="space-y-6">
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
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Cantidad de opciones (2-100)
            </label>
            <input 
              type="number"
              min="2"
              max="100"
              value={puntosPersonalizado}
              onChange={(e) => handlePuntosChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
                Extremo Izquierdo
              </label>
              <input
                type="text"
                value={extremoIzq}
                onChange={(e) => handleExtremoChange('extremoIzquierdo', e.target.value)}
                placeholder="Ej: Mínimo"
                className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
                Extremo Derecho
              </label>
              <input
                type="text"
                value={extremoDer}
                onChange={(e) => handleExtremoChange('extremoDerecho', e.target.value)}
                placeholder="Ej: Máximo"
                className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Etiquetas de las opciones
            </label>
            <div className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wide">
              <div className="w-6 text-right">#</div>
              <div className="flex-1">Etiqueta</div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border border-[color:var(--card-border)] rounded-lg p-3 bg-[color:var(--bg-secondary)]">
                {configuracion.opciones?.map((opcion, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[color:var(--text-tertiary)] w-6 text-right">{index + 1}</span>
                        <input
                            type="text"
                            value={opcion.text}
                            onChange={(e) => handleOpcionTextChange(index, e.target.value)}
                            className="flex-1 px-2 py-1.5 rounded bg-[color:var(--input-background)] border border-[color:var(--card-border)] text-sm focus:border-[color:var(--primary)] focus:outline-none"
                        />
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Vista previa */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-[color:var(--text-secondary)] mb-3 uppercase tracking-wide">
          Vista previa
        </p>
        <div className="p-6 bg-[color:var(--hover-bg)] rounded-xl border border-[color:var(--card-border)]">
          
          <div className="space-y-4">
             {/* Textos extremos */}
            <div className="flex justify-between text-sm font-medium text-[color:var(--text-secondary)] px-1">
                <span>{izquierdoDisplay}</span>
                <span>{derechoDisplay}</span>
            </div>

            {/* Visual Scale */}
            <div className="flex flex-wrap gap-2 justify-center">
                {opcionesDisplay.map((opcion, index) => (
                    <div 
                        key={index}
                        className={`
                            min-w-[40px] px-3 py-2 
                            flex items-center justify-center 
                            rounded-md border border-[color:var(--card-border)] 
                            bg-[color:var(--card-background)] text-[color:var(--text-primary)] 
                            text-sm font-medium shadow-sm
                            transition-all
                        `}
                        title={opcion.text}
                    >
                        {opcion.text}
                    </div>
                ))}
            </div>
            
             {/* Explanation hint */}
             {modo === 'personalizada' && opcionesDisplay.length > 10 && (
                <p className="text-xs text-center text-[color:var(--text-tertiary)]">
                    * La visualización puede variar según el tamaño de pantalla del dispositivo.
                </p>
             )}

          </div>
        </div>
      </div>
    </div>
  );
}

