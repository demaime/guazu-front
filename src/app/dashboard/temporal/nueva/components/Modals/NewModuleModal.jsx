"use client";

import { useState, useEffect } from 'react';

export default function NewModuleModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  moduleName, 
  setModuleName,
  modulosLength 
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

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center p-4 z-50 transition-all duration-200 ${
        isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
      }`}
    >
      <div 
        className={`bg-[color:var(--card-background)] rounded-lg p-6 max-w-sm w-full border border-[color:var(--card-border)] shadow-lg transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-4">Nuevo módulo</h3>
        <input
          type="text"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          placeholder={`Módulo ${modulosLength + 1}`}
          className="w-full px-4 py-2 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border-2 border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:outline-none mb-4 text-sm"
          onKeyPress={(e) => e.key === 'Enter' && onConfirm()}
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] font-medium transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-[color:var(--primary)] hover:opacity-90 text-white font-medium transition-colors text-sm"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

