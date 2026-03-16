"use client";

import { X, ChevronDown, Save, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import OptionsEditor from '../OptionsEditor';
import MatrixEditor from '../MatrixEditor';
import MultiTextFieldsEditor from '../MultiTextFieldsEditor';
import ScaleEditor from '../ScaleEditor';
import BulkAddModal from './BulkAddModal';
import ConditionalEditor from '../ConditionalEditor';
import ValidatorsEditor from '../ValidatorsEditor';
import ConfirmModal from './ConfirmModal';

export default function QuestionEditorModal({ 
  isOpen, 
  onClose, 
  isNew = false,
  onDiscard,
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
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showQuotaWarning, setShowQuotaWarning] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const isMobile = useMobileDetect();

  const TIPOS_CON_OPCIONES = ['opcion-unica', 'opcion-multiple', 'desplegable', 'ordenar', 'cuota-genero', 'cuota-edad'];

  const renumerar = (ops = []) => ops.map((opt, i) => ({ ...opt, value: String(i + 1) }));

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
      // Inicializar estado local con los datos de la pregunta
      if (pregunta) {
        const newData = {
          value: pregunta.value || '',
          text: pregunta.text || '',
          tipo: pregunta.tipo || 'texto',
          indicaciones: pregunta.indicaciones || '',
          opciones: pregunta.opciones || [],
          filas: pregunta.filas || [],
          columnas: pregunta.columnas || [],
          campos: pregunta.campos || [],
          configuracionEscala: pregunta.configuracionEscala || {},
          requerida: pregunta.requerida !== undefined ? pregunta.requerida : true,
          condicionada: pregunta.condicionada || { activa: false, condiciones: [] },
          validadores: pregunta.validadores || { activo: false, reglas: [] },
        };

        // Inicializar para cuota-genero
        if (pregunta.tipo === 'cuota-genero') {
          // Valor predeterminado editable
          if (!pregunta.value) {
            newData.value = 'cuota_genero';
          }
          
          // Opciones predeterminadas editables
          if (!pregunta.opciones || pregunta.opciones.length === 0) {
            newData.opciones = [
              { id: Date.now() + '_1', value: '1', text: 'Masculino' },
              { id: Date.now() + '_2', value: '2', text: 'Femenino' }
            ];
          } else {
            newData.opciones = renumerar(newData.opciones);
          }
        }

        // Inicializar para cuota-edad
        if (pregunta.tipo === 'cuota-edad') {
          // Valor predeterminado editable
          if (!pregunta.value) {
            newData.value = 'cuota_edad';
          }
          
          // Opciones predeterminadas editables (3 rangos)
          if (!pregunta.opciones || pregunta.opciones.length === 0) {
            newData.opciones = [
              { id: Date.now() + '_1', value: '1', text: '18-35' },
              { id: Date.now() + '_2', value: '2', text: '36-55' },
              { id: Date.now() + '_3', value: '3', text: '56+' }
            ];
          } else {
            newData.opciones = renumerar(newData.opciones);
          }
        }

        setEditedData(newData);
      }
    } else {
      setIsAnimating(false);
      setEditedData({});
      setValidationErrors({});
    }
  }, [isOpen, pregunta]);

  // Aplicar actualizaciones externas (ej: desde el selector de tipo)
  useEffect(() => {
    if (externalUpdate && isOpen) {
      if (externalUpdate.tipo === 'cuota-genero' || externalUpdate.tipo === 'cuota-edad') {
        setEditedData(prev => {
          const merged = { ...prev, ...externalUpdate };
          merged.opciones = renumerar(merged.opciones || []);
          return merged;
        });
      } else {
        setEditedData(prev => ({ ...prev, ...externalUpdate }));
      }
      
      // Mostrar advertencia si se selecciona tipo cuota
      if (externalUpdate.tipo === 'cuota-genero' || externalUpdate.tipo === 'cuota-edad') {
        setShowQuotaWarning(true);
      }
    }
  }, [externalUpdate, isOpen]);

  if (!isOpen || !pregunta) return null;

  const tipoActual = tiposPreguntas.find(t => t.value === editedData.tipo);
  const Icon = tipoActual?.icon;

  const handleSave = () => {
    const errors = {};

    if (!editedData.text?.trim()) {
      errors.text = true;
    }

    if (!editedData.value?.trim()) {
      errors.value = true;
    }

    if (TIPOS_CON_OPCIONES.includes(editedData.tipo)) {
      const opcionesConTexto = (editedData.opciones || []).filter(o => o.text?.trim());
      if (opcionesConTexto.length < 2) {
        errors.opciones = true;
      }
    }

    if (editedData.condicionada?.activa && (!editedData.condicionada.condiciones || editedData.condicionada.condiciones.length === 0)) {
      errors.condicionada = true;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);

      let msg = '';
      if (errors.text) msg = 'Debes ingresar el texto de la pregunta.';
      else if (errors.value) msg = 'Debes ingresar el nombre de la variable de la pregunta.';
      else if (errors.opciones) msg = 'Este tipo de pregunta requiere al menos 2 opciones con texto.';
      else if (errors.condicionada) msg = 'Ha marcado esta pregunta como condicional pero no ha establecido ninguna condición. Por favor, indique al menos una condición o desactive la casilla.';

      setValidationMessage(msg);
      setShowValidationModal(true);
      return;
    }

    setValidationErrors({});
    onSave(editedData);
    onClose();
  };

  const updateField = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
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

    // Numérica: validadores
    if (tipo === 'numerica') {
      const preguntasNumericas = preguntasDisponibles.filter((p) => p.tipo === 'numerica');
      return (
        <ValidatorsEditor
          validadores={editedData.validadores || { activo: false, reglas: [] }}
          preguntasNumericas={preguntasNumericas}
          onUpdate={(val) => updateField('validadores', val)}
        />
      );
    }

    // Tipos sin configuración especial
    if (['texto', 'fecha', 'foto', 'microfono'].includes(tipo)) {
      return (
        <div className="bg-[color:var(--hover-bg)] border border-[color:var(--card-border)] rounded-lg p-4">
          <p className="text-xs text-[color:var(--text-secondary)] text-center">
            Este tipo de pregunta no requiere configuración adicional.
          </p>
        </div>
      );
    }

    // Cuota Género - Opciones editables
    if (tipo === 'cuota-genero') {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-2">
              Opciones de género
            </label>
            <OptionsEditor
              opciones={editedData.opciones || []}
              onUpdate={(opciones) => updateField('opciones', opciones)}
              onBulkAdd={() => handleBulkAdd('opciones')}
              label=""
              placeholder="Ej: Masculino, Femenino"
            />
            <p className="text-xs text-[color:var(--text-muted)] mt-2">
              Define las opciones de género que necesitas. Puedes agregar, editar o eliminar opciones según tus necesidades.
            </p>
          </div>
        </div>
      );
    }

    // Cuota Edad - Rangos configurables
    if (tipo === 'cuota-edad') {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-2">
              Rangos de edad
            </label>
            <OptionsEditor
              opciones={editedData.opciones || []}
              onUpdate={(opciones) => updateField('opciones', opciones)}
              onBulkAdd={() => handleBulkAdd('opciones')}
              label=""
              placeholder="Ej: 18-35, 36-55, 56+"
            />
            <p className="text-xs text-[color:var(--text-muted)] mt-2">
              Define los rangos etarios que necesitas para esta encuesta. Puedes agregar, editar o eliminar rangos según tus necesidades.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // Renderizar contenido del formulario (compartido entre mobile y desktop)
  const renderFormContent = () => (
    <>
      {/* Variable name */}
      <div>
        <label className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${validationErrors.value ? 'text-red-500' : 'text-[color:var(--text-secondary)]'}`}>
          Variable (nombre interno) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={editedData.value || ''}
          onChange={(e) => updateField('value', e.target.value)}
          className={`w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border ${validationErrors.value ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-[color:var(--primary)]/20'} focus:ring-2 focus:outline-none text-base font-mono transition-all`}
          placeholder="Ej: p1, edad, genero..."
        />
        {validationErrors.value && (
          <p className="text-xs text-red-500 mt-1">Este campo es obligatorio.</p>
        )}
      </div>

      {/* Texto de la pregunta */}
      <div>
        <label className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${validationErrors.text ? 'text-red-500' : 'text-[color:var(--text-secondary)]'}`}>
          Texto de la pregunta <span className="text-red-500">*</span>
        </label>
        <textarea
          value={editedData.text || ''}
          onChange={(e) => updateField('text', e.target.value)}
          placeholder="Escribe aquí la pregunta que verá el usuario..."
          rows={3}
          className={`w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border ${validationErrors.text ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-[color:var(--primary)]/20'} focus:ring-2 focus:outline-none text-base transition-all resize-none`}
          autoFocus
        />
        {validationErrors.text && (
          <p className="text-xs text-red-500 mt-1">Este campo es obligatorio.</p>
        )}
      </div>

      {/* Tipo de pregunta */}
      <div>
        <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide">
          Tipo de pregunta
        </label>
        <button
          type="button"
          onClick={() => onOpenTypeSelector(editedData.tipo)}
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
          className="w-full px-3 py-2.5 rounded-lg bg-[color:var(--input-background)] text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] border border-[color:var(--card-border)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:outline-none text-base transition-all"
          placeholder="Ej: Seleccione una opción, Ingrese su respuesta..."
        />
      </div>

      {/* Pregunta obligatoria */}
      <div className="flex items-center justify-between py-2 px-1">
        <div>
          <span className="text-sm font-medium text-[color:var(--text-primary)]">Pregunta obligatoria</span>
          <p className="text-xs text-[color:var(--text-muted)]">
            {editedData.requerida
              ? 'El encuestado debe responder para continuar'
              : 'El encuestado puede omitir esta pregunta'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => updateField('requerida', !editedData.requerida)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            editedData.requerida ? 'bg-[color:var(--primary)]' : 'bg-[color:var(--card-border)]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              editedData.requerida ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
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
    </>
  );

  // Mobile: Full-screen page
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-[color:var(--background)] z-[100] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[color:var(--card-border)] bg-[color:var(--card-background)]">
            <button
              onClick={isNew && onDiscard ? onDiscard : onClose}
              className="p-2 -ml-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 className="text-base font-semibold text-[color:var(--text-primary)]">Editar pregunta</h3>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {renderFormContent()}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[color:var(--card-border)] bg-[color:var(--card-background)] flex gap-3">
            <button
              onClick={isNew && onDiscard ? onDiscard : onClose}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)] font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Guardar
            </button>
          </div>
        </div>

        {/* Modales auxiliares */}
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

        <ConfirmModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          onConfirm={() => setShowValidationModal(false)}
          title="Campos obligatorios incompletos"
          message={validationMessage}
          confirmText="Entendido"
          cancelText={null}
        />

        <ConfirmModal
          isOpen={showQuotaWarning}
          onClose={() => setShowQuotaWarning(false)}
          onConfirm={() => setShowQuotaWarning(false)}
          title="Pregunta de Cuota Detectada"
          message="Al seleccionar una pregunta de cuota, la cantidad de encuestas a recolectar se calculará según la distribución de cuotas que definas en la pestaña Configuración"
          confirmText="Entendido"
          cancelText={null}
          iconColor="warning"
        />
      </>
    );
  }

  // Desktop: Modal overlay (original behavior)
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
            onClick={isNew && onDiscard ? onDiscard : onClose}
            className="p-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {renderFormContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--card-border)] flex gap-3">
          <button
            onClick={isNew && onDiscard ? onDiscard : onClose}
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

      {/* Modal de validación */}
      <ConfirmModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        onConfirm={() => setShowValidationModal(false)}
        title="Campos obligatorios incompletos"
        message={validationMessage}
        confirmText="Entendido"
        cancelText={null}
      />

      {/* Modal de advertencia de cuotas */}
      <ConfirmModal
        isOpen={showQuotaWarning}
        onClose={() => setShowQuotaWarning(false)}
        onConfirm={() => setShowQuotaWarning(false)}
        title="Pregunta de Cuota Detectada"
        message="Al seleccionar una pregunta de cuota, la cantidad de encuestas a recolectar se calculará según la distribución de cuotas que definas en la pestaña Configuración"
        confirmText="Entendido"
        cancelText={null}
        iconColor="warning"
      />
    </div>
  );
}
