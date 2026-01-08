"use client";

import { X, ChevronDown, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import OptionsEditor from '../OptionsEditor';
import MatrixEditor from '../MatrixEditor';
import MultiTextFieldsEditor from '../MultiTextFieldsEditor';
import ScaleEditor from '../ScaleEditor';
import BulkAddModal from './BulkAddModal';
import ConditionalEditor from '../ConditionalEditor';

export default function QuestionEditorModal({ 
  isOpen, 
  onClose, 
  pregunta,
  moduloId,
  onSave,
  tiposPreguntas,
  onOpenTypeSelector,
  externalUpdate,
  preguntasDisponibles = [] // Preguntas con opciones para condiciones
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);
  const [bulkAddTarget, setBulkAddTarget] = useState(null); // 'opciones' | 'filas' | 'columnas'

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
      // Inicializar estado local con los datos de la pregunta
      if (pregunta) {
        setEditedData({
          value: pregunta.value || '',
          text: pregunta.text || '',
          tipo: pregunta.tipo || 'texto',
          indicaciones: pregunta.indicaciones || '',
          opciones: pregunta.opciones || [],
          filas: pregunta.filas || [],
          columnas: pregunta.columnas || [],
          campos: pregunta.campos || [],
          configuracionEscala: pregunta.configuracionEscala || {},
          condicionada: pregunta.condicionada || { activa: false, condiciones: [] }
        });
      }
    } else {
      setIsAnimating(false);
      setEditedData({});
    }
  }, [isOpen, pregunta]);

  // Aplicar actualizaciones externas (ej: desde el selector de tipo)
  useEffect(() => {
    if (externalUpdate && isOpen) {
      setEditedData(prev => ({ ...prev, ...externalUpdate }));
    }
  }, [externalUpdate, isOpen]);

  if (!isOpen || !pregunta) return null;

  const tipoActual = tiposPreguntas.find(t => t.value === editedData.tipo);
  const Icon = tipoActual?.icon;

  const handleSave = () => {
    onSave(editedData);
    onClose();
  };

  const updateField = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkAdd = (target) => {
    setBulkAddTarget(target);
    setBulkAddModalOpen(true);
  };

  const handleBulkAddConfirm = (items) => {
    if (bulkAddTarget === 'opciones') {
      setEditedData(prev => ({ ...prev, opciones: items }));
    } else if (bulkAddTarget === 'filas') {
      setEditedData(prev => ({ ...prev, filas: items }));
    } else if (bulkAddTarget === 'columnas') {
      setEditedData(prev => ({ ...prev, columnas: items }));
    }
    setBulkAddModalOpen(false);
    setBulkAddTarget(null);
  };

  const renderConfiguracionEspecifica = () => {
    const tipo = editedData.tipo;

    // Tipos con opciones simples
    if (['opcion-unica', 'opcion-multiple', 'desplegable', 'ordenar'].includes(tipo)) {
      return (
        <OptionsEditor
          opciones={editedData.opciones || []}
          onUpdate={(opciones) => updateField('opciones', opciones)}
          onBulkAdd={() => handleBulkAdd('opciones')}
          label="Opciones"
          allowReorder={tipo === 'ordenar'}
        />
      );
    }

    // Texto múltiple
    if (tipo === 'texto-multiple') {
      return (
        <MultiTextFieldsEditor
          campos={editedData.campos || []}
          onUpdate={(campos) => updateField('campos', campos)}
        />
      );
    }

    // Matrices
    if (['matriz', 'matriz-multiple', 'matriz-dinamica'].includes(tipo)) {
      return (
        <MatrixEditor
          filas={editedData.filas || []}
          columnas={editedData.columnas || []}
          onUpdateFilas={(filas) => updateField('filas', filas)}
          onUpdateColumnas={(columnas) => updateField('columnas', columnas)}
          onBulkAddFilas={() => handleBulkAdd('filas')}
          onBulkAddColumnas={() => handleBulkAdd('columnas')}
          tipoMatriz={tipo}
        />
      );
    }

    // Escala
    if (tipo === 'escala') {
      return (
        <ScaleEditor
          configuracion={editedData.configuracionEscala || {}}
          onUpdate={(config) => {
            updateField('configuracionEscala', config);
            // También actualizar las opciones directamente
            if (config.opciones) {
              updateField('opciones', config.opciones);
            }
          }}
        />
      );
    }

    // Tipos sin configuración especial
    if (['texto', 'numerica', 'fecha', 'foto', 'microfono'].includes(tipo)) {
      return (
        <div className="bg-[color:var(--hover-bg)] border border-[color:var(--card-border)] rounded-lg p-4">
          <p className="text-xs text-[color:var(--text-secondary)] text-center">
            Este tipo de pregunta no requiere configuración adicional.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center p-4 z-[100] transition-all duration-200 ${
        isAnimating ? 'bg-opacity-70' : 'bg-opacity-0'
      }`}
    >
      <div 
        className={`bg-[color:var(--card-background)] rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col border border-[color:var(--card-border)] shadow-2xl transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[color:var(--card-border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Editar pregunta</h3>
          <button
            onClick={onClose}
            className="p-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Variable name */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Variable (nombre interno)
            </label>
            <input
              type="text"
              value={editedData.value || ''}
              onChange={(e) => updateField('value', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:outline-none text-sm font-mono transition-all"
              placeholder="p1"
            />
          </div>

          {/* Texto de la pregunta */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Texto de la pregunta
            </label>
            <textarea
              value={editedData.text || ''}
              onChange={(e) => updateField('text', e.target.value)}
              placeholder="Escribe aquí la pregunta que verá el usuario..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:outline-none text-sm transition-all resize-none"
              autoFocus
            />
          </div>

          {/* Tipo de pregunta */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Tipo de pregunta
            </label>
            <button
              type="button"
              onClick={onOpenTypeSelector}
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] border border-[color:var(--card-border)] hover:border-[color:var(--primary)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:outline-none text-sm transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon size={16} />}
                <span>{tipoActual?.label || 'Seleccionar tipo'}</span>
              </div>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Instrucciones */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
              Instrucciones para el usuario
            </label>
            <input
              type="text"
              value={editedData.indicaciones || ''}
              onChange={(e) => updateField('indicaciones', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:outline-none text-sm transition-all"
              placeholder="Ej: Seleccione una opción, Ingrese su respuesta..."
            />
          </div>

          {/* Condiciones de visibilidad */}
          {preguntasDisponibles.length > 0 && (
            <ConditionalEditor
              condicionada={editedData.condicionada}
              preguntasDisponibles={preguntasDisponibles}
              onUpdate={(nuevaCondicionada) => updateField('condicionada', nuevaCondicionada)}
              label="Pregunta condicional"
            />
          )}

          {/* Configuración específica según el tipo */}
          {renderConfiguracionEspecifica()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--card-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)] font-medium transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>

      {/* Modal de carga rápida */}
      <BulkAddModal
        isOpen={bulkAddModalOpen}
        onClose={() => {
          setBulkAddModalOpen(false);
          setBulkAddTarget(null);
        }}
        onConfirm={handleBulkAddConfirm}
        title={
          bulkAddTarget === 'filas' ? 'Carga rápida de filas' :
          bulkAddTarget === 'columnas' ? 'Carga rápida de columnas' :
          'Carga rápida de opciones'
        }
        placeholder={
          bulkAddTarget === 'filas' ? 'Ingresa una fila por línea...\n\nEjemplo:\nProducto A\nProducto B\nProducto C' :
          bulkAddTarget === 'columnas' ? 'Ingresa una columna por línea...\n\nEjemplo:\nCalidad\nPrecio\nServicio' :
          'Ingresa una opción por línea...\n\nEjemplo:\nBuena\nMala\nRegular'
        }
      />
    </div>
  );
}

