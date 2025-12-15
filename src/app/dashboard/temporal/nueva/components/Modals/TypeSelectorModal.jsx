"use client";

import { X, Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function TypeSelectorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  tiposPreguntas,
  tipoActual,
  busqueda,
  setBusqueda
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tiposFiltrados = busqueda
    ? tiposPreguntas.filter(t => 
        t.label.toLowerCase().includes(busqueda.toLowerCase())
      )
    : tiposPreguntas;

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center p-4 z-[200] transition-all duration-200 ${
        isAnimating ? 'bg-opacity-70' : 'bg-opacity-0'
      }`}
    >
      <div 
        className={`bg-[color:var(--card-background)] rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col border border-[color:var(--card-border)] shadow-2xl transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="p-4 border-b border-[color:var(--card-border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Seleccionar tipo de pregunta</h3>
          <button
            onClick={onClose}
            className="p-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-[color:var(--card-border)]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tipo de pregunta..."
              className="w-full pl-10 pr-4 py-3 bg-[color:var(--input-background)] border border-[color:var(--card-border)] rounded-lg text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-[color:var(--primary)] focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4 max-h-96">
          {tiposFiltrados.length === 0 ? (
            <p className="text-center text-[color:var(--text-muted)] py-8">No se encontraron tipos de pregunta</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tiposFiltrados.map((tipo) => {
                const esSeleccionado = tipoActual === tipo.value;
                const Icon = tipo.icon;
                
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => onSelect(tipo)}
                    className={`px-4 py-3 text-left rounded-lg transition-all border ${
                      esSeleccionado
                        ? 'bg-[color:var(--primary)]/20 border-[color:var(--primary)] text-[color:var(--primary)]'
                        : 'bg-[color:var(--card-background)] border-[color:var(--card-border)] hover:bg-[color:var(--hover-bg)] hover:border-[color:var(--primary)] text-[color:var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="text-sm font-medium">{tipo.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

