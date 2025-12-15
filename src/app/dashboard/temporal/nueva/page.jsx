"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FolderPlus, Type, Hash, Radio, CheckSquare, Grid3x3, AlignLeft, User, Calendar, Mic, Camera, BarChart3, ChevronDown, GripVertical } from 'lucide-react';
import FormHeader from './components/FormHeader';
import ModuleCard from './components/ModuleCard';
import NewModuleModal from './components/Modals/NewModuleModal';
import TypeSelectorModal from './components/Modals/TypeSelectorModal';
import QuestionEditorModal from './components/Modals/QuestionEditorModal';
import ConfirmModal from './components/Modals/ConfirmModal';
import { useSurveyCreation } from '../context/SurveyCreationContext';
import { surveyService } from '@/services/survey.service';
import { toast } from "react-toastify";

export default function FormBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('id');
  
  const { surveyData, updateSurveyData } = useSurveyCreation();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modulos, setModulos] = useState([]);
  const [isLoading, setIsLoading] = useState(!!surveyId);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar encuesta existente si hay ID
  useEffect(() => {
    if (surveyId) {
      loadSurvey(surveyId);
    }
  }, [surveyId]);

  const loadSurvey = async (id) => {
    try {
      setIsLoading(true);
      const response = await surveyService.getSurvey(id);
      
      // Extraer datos de la encuesta
      const surveyData = response?.survey?.survey || response?.survey;
      const surveyInfo = response?.survey?.surveyInfo || {};
      
      if (surveyData) {
        setTitulo(surveyData.title || '');
        setDescripcion(surveyData.description || '');
        
        // 1) Si viene surveyDefinition (módulos del nuevo editor), usarlo
        const definition = response?.survey?.surveyDefinition;
        if (definition?.modulos && Array.isArray(definition.modulos)) {
          setModulos(definition.modulos);
        } else {
          // 2) Fallback: reconstruir módulos desde SurveyJS (encuestas viejas)
          const { transformSurveyJSToModulos } = await import('../utils/transformToSurveyJS');
          const recovered = transformSurveyJSToModulos(surveyData);
          setModulos(recovered);
        }
      }
    } catch (error) {
      console.error('Error al cargar encuesta:', error);
      toast.error(`Error al cargar la encuesta: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  const [expandida, setExpandida] = useState(null);
  const [expandidaModulos, setExpandidaModulos] = useState({});
  const [arrastrando, setArrastrando] = useState(null);
  const [modalNuevoModulo, setModalNuevoModulo] = useState(false);
  const [nombreModulo, setNombreModulo] = useState('');
  const [tituloFocused, setTituloFocused] = useState(true);
  const [moduloCondicionandose, setModuloCondicionandose] = useState(null);
  const [moduloDinamizandose, setModuloDinamizandose] = useState(null);
  const [condicionExpandida, setCondicionExpandida] = useState(null);
  const [condicionModuloExpandida, setCondicionModuloExpandida] = useState(null);
  const [modalCargaRapida, setModalCargaRapida] = useState(null);
  const [textoCargaRapida, setTextoCargaRapida] = useState('');
  
  const [modalSelectorPregunta, setModalSelectorPregunta] = useState(null);
  const [modalSelectorValores, setModalSelectorValores] = useState(null);
  const [modalSelectorTipo, setModalSelectorTipo] = useState(null);
  const [busquedaModalPregunta, setBusquedaModalPregunta] = useState('');
  const [busquedaModalValores, setBusquedaModalValores] = useState('');
  const [busquedaModalTipo, setBusquedaModalTipo] = useState('');
  const [valoresTempModal, setValoresTempModal] = useState([]);
  
  const [modalEditarPregunta, setModalEditarPregunta] = useState(null); // { moduloId, preguntaId }
  const [modalConfirmEliminar, setModalConfirmEliminar] = useState(null); // { tipo: 'modulo'|'pregunta', data: {...} }
  const [externalUpdateForQuestion, setExternalUpdateForQuestion] = useState(null);
  
  const [historial, setHistorial] = useState([]);
  const [indiceHistorial, setIndiceHistorial] = useState(-1);
  const [aplicandoHistorial, setAplicandoHistorial] = useState(false);
  
  const [indiceAbierto, setIndiceAbierto] = useState(false);
  const [busquedaIndice, setBusquedaIndice] = useState('');
  
  const [busquedaOpciones, setBusquedaOpciones] = useState('');
  const [busquedaPregunta, setBusquedaPregunta] = useState('');

  React.useEffect(() => {
    const tituloTextarea = document.querySelector('[data-titulo-encuesta]');
    if (tituloTextarea && tituloFocused) {
      tituloTextarea.focus();
    }
  }, []);

  React.useEffect(() => {
    if (expandida) {
      setTimeout(() => {
        const elemento = document.querySelector(`[data-pregunta-card="${expandida}"]`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [expandida]);

  React.useEffect(() => {
    const elementos = document.querySelectorAll('[data-auto-scroll="true"]');
    if (elementos.length > 0) {
      const ultimoElemento = elementos[elementos.length - 1];
      setTimeout(() => {
        ultimoElemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ultimoElemento.removeAttribute('data-auto-scroll');
      }, 150);
    }
  });

  React.useEffect(() => {
    if (aplicandoHistorial) return;
    
    const estadoActual = { titulo, descripcion, modulos };
    
    if (historial.length === 0 || JSON.stringify(historial[indiceHistorial]) !== JSON.stringify(estadoActual)) {
      const nuevoHistorial = historial.slice(0, indiceHistorial + 1);
      nuevoHistorial.push(estadoActual);
      
      if (nuevoHistorial.length > 50) {
        nuevoHistorial.shift();
        setHistorial(nuevoHistorial);
      } else {
        setHistorial(nuevoHistorial);
        setIndiceHistorial(indiceHistorial + 1);
      }
    }
  }, [modulos, titulo, descripcion, aplicandoHistorial]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        deshacer();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        rehacer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [indiceHistorial, historial]);

  // Limpiar estado de arrastre en caso de que el drag termine inesperadamente
  React.useEffect(() => {
    const handleDragEnd = () => {
      setArrastrando(null);
    };

    const handleMouseUp = () => {
      // Pequeño delay para asegurar que otros handlers se ejecuten primero
      setTimeout(() => setArrastrando(null), 100);
    };

    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  React.useEffect(() => {
    if (modalSelectorValores) {
      setValoresTempModal(modalSelectorValores.valoresSeleccionados || []);
    }
  }, [modalSelectorValores]);

  const guardarEnHistorial = (nuevoEstado) => {
    const nuevoHistorial = historial.slice(0, indiceHistorial + 1);
    nuevoHistorial.push(nuevoEstado);
    if (nuevoHistorial.length > 50) {
      nuevoHistorial.shift();
    } else {
      setIndiceHistorial(indiceHistorial + 1);
    }
    setHistorial(nuevoHistorial);
  };

  const deshacer = () => {
    if (indiceHistorial > 0) {
      setAplicandoHistorial(true);
      const nuevoIndice = indiceHistorial - 1;
      setIndiceHistorial(nuevoIndice);
      const estadoAnterior = historial[nuevoIndice];
      setTitulo(estadoAnterior.titulo);
      setDescripcion(estadoAnterior.descripcion);
      setModulos(estadoAnterior.modulos);
      setTimeout(() => setAplicandoHistorial(false), 100);
    }
  };

  const rehacer = () => {
    if (indiceHistorial < historial.length - 1) {
      setAplicandoHistorial(true);
      const nuevoIndice = indiceHistorial + 1;
      setIndiceHistorial(nuevoIndice);
      const estadoSiguiente = historial[nuevoIndice];
      setTitulo(estadoSiguiente.titulo);
      setDescripcion(estadoSiguiente.descripcion);
      setModulos(estadoSiguiente.modulos);
      setTimeout(() => setAplicandoHistorial(false), 100);
    }
  };

  const setModulosConHistorial = (nuevosModulos) => {
    const nuevoEstado = {
      titulo,
      descripcion,
      modulos: typeof nuevosModulos === 'function' ? nuevosModulos(modulos) : nuevosModulos
    };
    guardarEnHistorial(nuevoEstado);
    setModulos(nuevoEstado.modulos);
  };

  const obtenerTodasLasPreguntas = () => {
    const todasLasPreguntas = [];
    let numeroGlobal = 1;
    
    modulos.forEach((modulo) => {
      modulo.preguntas.forEach((pregunta) => {
        todasLasPreguntas.push({
          id: pregunta.id,
          numero: numeroGlobal,
          text: pregunta.text || 'Sin texto',
          value: pregunta.value,
          moduloId: modulo.id,
          moduloNombre: modulo.nombre,
          tieneCondiciones: pregunta.condicionada?.activa || false,
          tipo: pregunta.tipo
        });
        numeroGlobal++;
      });
    });
    
    return todasLasPreguntas;
  };

  const tiposPreguntas = [
    { value: 'texto', label: 'Texto', icon: Type },
    { value: 'texto-multiple', label: 'Múltiples campos de texto', icon: AlignLeft },
    { value: 'numerica', label: 'Numérica', icon: Hash },
    { value: 'opcion-unica', label: 'Opción única', icon: Radio },
    { value: 'opcion-multiple', label: 'Opción múltiple', icon: CheckSquare },
    { value: 'matriz', label: 'Matriz', icon: Grid3x3 },
    { value: 'matriz-multiple', label: 'Matriz con opción múltiple', icon: Grid3x3 },
    { value: 'matriz-dinamica', label: 'Matriz con fila dinámica', icon: Grid3x3 },
    { value: 'desplegable', label: 'Desplegable con buscador', icon: ChevronDown },
    { value: 'escala', label: 'Escala Muy buena - Muy mala', icon: BarChart3 },
    { value: 'ordenar', label: 'Ordenar opciones', icon: GripVertical },
    { value: 'fecha', label: 'Fecha', icon: Calendar },
    { value: 'foto', label: 'Foto', icon: Camera },
    { value: 'microfono', label: 'Micrófono', icon: Mic }
  ];

  const validarValueUnico = (value, preguntaId) => {
    const todasLasPreguntas = modulos.flatMap(m => m.preguntas);
    
    return !todasLasPreguntas.some(p => 
      p.id !== preguntaId && p.value === value
    );
  };

  const getIndicacionesPorDefecto = (tipo) => {
    switch(tipo) {
      case 'texto': return 'Ingrese su respuesta';
      case 'texto-multiple': return 'Complete los siguientes campos';
      case 'numerica': return 'Ingrese un número';
      case 'opcion-unica': return 'Seleccione una opción';
      case 'opcion-multiple': return 'Seleccione una o más opciones';
      case 'matriz': return 'Seleccione una opción para cada fila';
      case 'matriz-multiple': return 'Seleccione una o más opciones para cada fila';
      case 'desplegable': return 'Busque y seleccione una opción';
      case 'cuota-genero': return 'Seleccione su género';
      case 'cuota-edad': return 'Seleccione su rango de edad';
      case 'escala': return 'Evalúe según la escala';
      case 'ordenar': return 'Ordene las opciones según su preferencia';
      case 'foto': return 'Suba una foto';
      case 'microfono': return 'Grabe un audio';
      default: return '';
    }
  };

  const generarValue = (numeroPreg) => {
    return `p${numeroPreg}`;
  };

  const getIconoTipo = (tipo) => {
    const iconProps = { size: 14 };
    switch(tipo) {
      case 'texto': return <Type {...iconProps} />;
      case 'texto-multiple': return <AlignLeft {...iconProps} />;
      case 'numerica': return <Hash {...iconProps} />;
      case 'opcion-unica': return <Radio {...iconProps} />;
      case 'opcion-multiple': return <CheckSquare {...iconProps} />;
      case 'matriz': return <Grid3x3 {...iconProps} />;
      case 'matriz-multiple': return <Grid3x3 {...iconProps} />;
      case 'cuota-genero': return <User {...iconProps} />;
      case 'cuota-edad': return <User {...iconProps} />;
      case 'escala': return <BarChart3 {...iconProps} />;
      case 'foto': return <Camera {...iconProps} />;
      case 'microfono': return <Mic {...iconProps} />;
      default: return <Type {...iconProps} />;
    }
  };

  const getPreguntasConOpciones = (preguntaActualId) => {
    const todasLasPreguntas = [];
    modulos.forEach(modulo => {
      modulo.preguntas.forEach((pregunta, index) => {
        if (pregunta.id !== preguntaActualId) {
          const tieneOpciones = ['opcion-unica', 'opcion-multiple', 'desplegable', 'cuota-genero', 'cuota-edad', 'escala', 'ordenar', 'texto-multiple'].includes(pregunta.tipo);
          const esNumerica = pregunta.tipo === 'numerica';
          
          if (tieneOpciones || esNumerica) {
            const numeroTotal = modulos.reduce((acc, m) => {
              const idx = modulos.indexOf(m);
              const idxActual = modulos.indexOf(modulo);
              return acc + (idx < idxActual ? m.preguntas.length : 0);
            }, 0) + index + 1;
            
            todasLasPreguntas.push({
              ...pregunta,
              numeroDisplay: numeroTotal,
              moduloNombre: modulo.nombre
            });
          }
        }
      });
    });
    return todasLasPreguntas;
  };

  const obtenerResumenCondicion = (condicion, preguntasDisponibles) => {
    const pregunta = preguntasDisponibles.find(p => p.id === condicion.preguntaId);
    if (!pregunta) return 'Configurar condición';
    
    const tipo = condicion.tipo === 'mostrar' ? 'Mostrar si' : 'Ocultar si';
    const preguntaTexto = pregunta.text || 'Sin texto';
    
    let operadorTexto = '';
    let valorTexto = '';
    
    if (pregunta.tipo === 'numerica') {
      switch(condicion.operador) {
        case 'igual': operadorTexto = '='; break;
        case 'diferente': operadorTexto = '≠'; break;
        case 'mayor': operadorTexto = '>'; break;
        case 'menor': operadorTexto = '<'; break;
        case 'entre': operadorTexto = '⊂'; break;
      }
      
      if (condicion.operador === 'entre') {
        valorTexto = `${condicion.valorMin || '?'} - ${condicion.valorMax || '?'}`;
      } else {
        valorTexto = condicion.valorMin || '?';
      }
    } else {
      operadorTexto = condicion.operador === 'igual' ? '=' : '≠';
      if (condicion.valores && condicion.valores.length > 0) {
        const opciones = condicion.valores.map(v => {
          const opcion = pregunta.opciones.find((o, i) => (o.value || String(i + 1)) === v);
          return opcion?.text || v;
        });
        valorTexto = opciones.length > 2 
          ? `${opciones.slice(0, 2).join(', ')}... (+${opciones.length - 2})`
          : opciones.join(', ');
      } else {
        valorTexto = '?';
      }
    }
    
    return `${tipo} P${pregunta.numeroDisplay} ${operadorTexto} ${valorTexto}`;
  };

  const crearPreguntaBase = () => ({
    id: Date.now(),
    value: '',
    text: '',
    tipo: 'opcion-unica',
    indicaciones: 'Seleccione una opción',
    requerida: true,
    validadores: { 
      activo: false, 
      reglas: [],
      numerica: {
        min: '',
        max: '',
        soloEnteros: true
      }
    },
    condicionada: { 
      activa: false, 
      condiciones: []
    },
    opciones: [],
    filas: [
      { value: '1', text: '' },
      { value: '2', text: '' }
    ],
    columnas: [
      { value: '1', text: '' },
      { value: '2', text: '' },
      { value: '3', text: '' }
    ],
    campos: [],
    configuracionEscala: {},
    matrizDinamica: {
      columnas: [
        { value: 'col1', text: '', cellType: 'text' },
        { value: 'col2', text: '', cellType: 'text' }
      ],
      rowCount: 2,
      minRowCount: 1,
      maxRowCount: 10,
      addRowText: 'Agregar fila',
      removeRowText: 'Eliminar'
    }
  });

  const agregarModulo = () => {
    const nombre = nombreModulo.trim() || `Módulo ${modulos.length + 1}`;
    const nuevoModulo = {
      id: Date.now(),
      nombre: nombre,
      descripcion: '',
      preguntas: [],
      condicionada: { 
        activa: false, 
        condiciones: []
      },
      dinamico: {
        activo: false,
        panelCount: 1,
        minPanelCount: 0,
        maxPanelCount: 10,
        panelAddText: 'Agregar',
        panelRemoveText: 'Eliminar'
      },
      autoScroll: true
    };
    setModulos([...modulos, nuevoModulo]);
    setExpandidaModulos({ ...expandidaModulos, [nuevoModulo.id]: true });
    setExpandida(null);
    setModuloCondicionandose(null);
    setModuloDinamizandose(null);
    setCondicionExpandida(null);
    setCondicionModuloExpandida(null);
    setNombreModulo('');
    setModalNuevoModulo(false);
  };

  const agregarPregunta = (moduloId) => {
    const totalPreguntas = modulos.reduce((acc, m) => acc + m.preguntas.length, 0);
    const nuevaPregunta = {
      ...crearPreguntaBase(),
      value: generarValue(totalPreguntas + 1)
    };
    setModulos(modulos.map(m => 
      m.id === moduloId 
        ? { ...m, preguntas: [...m.preguntas, nuevaPregunta] }
        : m
    ));
    setModuloCondicionandose(null);
    setModuloDinamizandose(null);
    
    // Abrir modal de edición automáticamente
    setTimeout(() => {
      abrirModalEditarPregunta(moduloId, nuevaPregunta.id);
    }, 100);
  };

  const actualizarPregunta = (moduloId, preguntaId, updates) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId ? { ...p, ...updates} : p
            )
          }
        : m
    ));
  };

  const abrirModalEditarPregunta = (moduloId, preguntaId) => {
    setModalEditarPregunta({ moduloId, preguntaId });
  };

  const cerrarModalEditarPregunta = () => {
    setModalEditarPregunta(null);
  };

  const guardarPreguntaDesdeModal = (updates) => {
    if (modalEditarPregunta) {
      actualizarPregunta(modalEditarPregunta.moduloId, modalEditarPregunta.preguntaId, updates);
    }
  };

  const getPreguntaActual = () => {
    if (!modalEditarPregunta) return null;
    const modulo = modulos.find(m => m.id === modalEditarPregunta.moduloId);
    if (!modulo) return null;
    return modulo.preguntas.find(p => p.id === modalEditarPregunta.preguntaId);
  };

  const actualizarOpcion = (moduloId, preguntaId, index, campo, valor) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? {
                    ...p,
                    opciones: p.opciones.map((o, i) =>
                      i === index ? { ...o, [campo]: valor } : o
                    )
                  }
                : p
            )
          }
        : m
    ));
  };

  const actualizarFila = (moduloId, preguntaId, index, campo, valor) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? {
                    ...p,
                    filas: p.filas.map((f, i) =>
                      i === index ? { ...f, [campo]: valor } : f
                    )
                  }
                : p
            )
          }
        : m
    ));
  };

  const actualizarColumna = (moduloId, preguntaId, index, campo, valor) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? {
                    ...p,
                    columnas: p.columnas.map((c, i) =>
                      i === index ? { ...c, [campo]: valor } : c
                    )
                  }
                : p
            )
          }
        : m
    ));
  };

  const agregarFila = (moduloId, preguntaId) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? { ...p, filas: [...p.filas, { value: '', text: '' }] }
                : p
            )
          }
        : m
    ));
    
    setTimeout(() => {
      const pregunta = modulos.find(m => m.id === moduloId)?.preguntas.find(p => p.id === preguntaId);
      if (pregunta) {
        const nuevoIndex = pregunta.filas.length;
        const input = document.querySelector(`input[data-fila-id="${preguntaId}-${nuevoIndex}"]`);
        if (input) input.focus();
      }
    }, 50);
  };

  const agregarColumna = (moduloId, preguntaId) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? { ...p, columnas: [...p.columnas, { value: '', text: '' }] }
                : p
            )
          }
        : m
    ));
    
    setTimeout(() => {
      const pregunta = modulos.find(m => m.id === moduloId)?.preguntas.find(p => p.id === preguntaId);
      if (pregunta) {
        const nuevoIndex = pregunta.columnas.length;
        const input = document.querySelector(`input[data-columna-id="${preguntaId}-${nuevoIndex}"]`);
        if (input) input.focus();
      }
    }, 50);
  };

  const eliminarFila = (moduloId, preguntaId, index) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? { ...p, filas: p.filas.filter((_, i) => i !== index) }
                : p
            )
          }
        : m
    ));
  };

  const eliminarColumna = (moduloId, preguntaId, index) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? { ...p, columnas: p.columnas.filter((_, i) => i !== index) }
                : p
            )
          }
        : m
    ));
  };

  const agregarOpcion = (moduloId, preguntaId) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? { ...p, opciones: [...p.opciones, { value: '', text: '' }] }
                : p
            )
          }
        : m
    ));
    
    setTimeout(() => {
      const pregunta = modulos.find(m => m.id === moduloId)?.preguntas.find(p => p.id === preguntaId);
      if (pregunta) {
        const nuevoIndex = pregunta.opciones.length;
        const input = document.querySelector(`input[data-opcion-id="${preguntaId}-${nuevoIndex}"]`);
        if (input) input.focus();
      }
    }, 50);
  };

  const eliminarOpcion = (moduloId, preguntaId, index) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? {
            ...m,
            preguntas: m.preguntas.map(p =>
              p.id === preguntaId
                ? { ...p, opciones: p.opciones.filter((_, i) => i !== index) }
                : p
            )
          }
        : m
    ));
  };

  const procesarCargaRapida = () => {
    if (!modalCargaRapida || !textoCargaRapida.trim()) return;
    
    const { moduloId, preguntaId, tipo } = modalCargaRapida;
    
    const lineas = textoCargaRapida
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    const nuevosItems = lineas.map((texto, idx) => ({
      text: texto,
      value: String(idx + 1)
    }));
    
    const nuevosItemsDinamica = lineas.map((texto, idx) => ({
      text: texto,
      value: `col${idx + 1}`,
      cellType: 'text'
    }));
    
    if (tipo === 'columnas-dinamica') {
      setModulos(modulos.map(m =>
        m.id === moduloId
          ? {
              ...m,
              preguntas: m.preguntas.map(p =>
                p.id === preguntaId
                  ? { 
                      ...p, 
                      matrizDinamica: {
                        ...(p.matrizDinamica || {}),
                        columnas: nuevosItemsDinamica
                      }
                    }
                  : p
              )
            }
          : m
      ));
    } else {
      setModulos(modulos.map(m =>
        m.id === moduloId
          ? {
              ...m,
              preguntas: m.preguntas.map(p =>
                p.id === preguntaId
                  ? { 
                      ...p, 
                      [tipo === 'filas' ? 'filas' : tipo === 'columnas' ? 'columnas' : 'opciones']: nuevosItems 
                    }
                  : p
              )
            }
          : m
      ));
    }
    
    setModalCargaRapida(null);
    setTextoCargaRapida('');
  };

  const confirmarEliminarPregunta = (moduloId, preguntaId) => {
    const modulo = modulos.find(m => m.id === moduloId);
    const pregunta = modulo?.preguntas.find(p => p.id === preguntaId);
    setModalConfirmEliminar({
      tipo: 'pregunta',
      data: { moduloId, preguntaId, texto: pregunta?.text }
    });
  };

  const eliminarPregunta = (moduloId, preguntaId) => {
    setModulos(modulos.map(m =>
      m.id === moduloId
        ? { ...m, preguntas: m.preguntas.filter(p => p.id !== preguntaId) }
        : m
    ));
  };

  const confirmarEliminarModulo = (moduloId) => {
    const modulo = modulos.find(m => m.id === moduloId);
    setModalConfirmEliminar({
      tipo: 'modulo',
      data: { moduloId, nombre: modulo?.nombre }
    });
  };

  const eliminarModulo = (moduloId) => {
    setModulos(modulos.filter(m => m.id !== moduloId));
  };

  const renombrarModulo = (moduloId, nuevoNombre) => {
    setModulos(modulos.map(m =>
      m.id === moduloId ? { ...m, nombre: nuevoNombre } : m
    ));
  };

  const actualizarDescripcionModulo = (moduloId, nuevaDescripcion) => {
    setModulos(modulos.map(m =>
      m.id === moduloId ? { ...m, descripcion: nuevaDescripcion } : m
    ));
  };

  const actualizarModulo = (moduloId, updates) => {
    setModulos(modulos.map(m =>
      m.id === moduloId ? { ...m, ...updates } : m
    ));
  };

  const agregarCondicion = (moduloId, preguntaId) => {
    const pregunta = modulos.find(m => m.id === moduloId)?.preguntas.find(p => p.id === preguntaId);
    const nuevaCondicion = {
      id: Date.now(),
      tipo: 'mostrar',
      preguntaId: null,
      operador: 'igual',
      valores: [],
      valorMin: '',
      valorMax: ''
    };
    
    const newCondicionada = {
      ...pregunta.condicionada,
      condiciones: [...(pregunta.condicionada.condiciones || []), nuevaCondicion]
    };
    
    actualizarPregunta(moduloId, preguntaId, { condicionada: newCondicionada });
    setCondicionExpandida(nuevaCondicion.id);
  };

  const actualizarCondicion = (moduloId, preguntaId, condicionId, updates) => {
    const pregunta = modulos.find(m => m.id === moduloId)?.preguntas.find(p => p.id === preguntaId);
    const newCondiciones = pregunta.condicionada.condiciones.map(c =>
      c.id === condicionId ? { ...c, ...updates } : c
    );
    
    const newCondicionada = {
      ...pregunta.condicionada,
      condiciones: newCondiciones
    };
    
    actualizarPregunta(moduloId, preguntaId, { condicionada: newCondicionada });
  };

  const eliminarCondicion = (moduloId, preguntaId, condicionId) => {
    const pregunta = modulos.find(m => m.id === moduloId)?.preguntas.find(p => p.id === preguntaId);
    const newCondiciones = pregunta.condicionada.condiciones.filter(c => c.id !== condicionId);
    
    const newCondicionada = {
      ...pregunta.condicionada,
      condiciones: newCondiciones
    };
    
    actualizarPregunta(moduloId, preguntaId, { condicionada: newCondicionada });
  };

  const agregarCondicionModulo = (moduloId) => {
    const modulo = modulos.find(m => m.id === moduloId);
    const nuevaCondicion = {
      id: Date.now(),
      tipo: 'mostrar',
      preguntaId: null,
      operador: 'igual',
      valores: [],
      valorMin: '',
      valorMax: ''
    };
    
    const newCondicionada = {
      ...modulo.condicionada,
      condiciones: [...(modulo.condicionada.condiciones || []), nuevaCondicion]
    };
    
    actualizarModulo(moduloId, { condicionada: newCondicionada });
    setCondicionModuloExpandida(nuevaCondicion.id);
  };

  const actualizarCondicionModulo = (moduloId, condicionId, updates) => {
    const modulo = modulos.find(m => m.id === moduloId);
    const newCondiciones = modulo.condicionada.condiciones.map(c =>
      c.id === condicionId ? { ...c, ...updates } : c
    );
    
    const newCondicionada = {
      ...modulo.condicionada,
      condiciones: newCondiciones
    };
    
    actualizarModulo(moduloId, { condicionada: newCondicionada });
  };

  const eliminarCondicionModulo = (moduloId, condicionId) => {
    const modulo = modulos.find(m => m.id === moduloId);
    const newCondiciones = modulo.condicionada.condiciones.filter(c => c.id !== condicionId);
    
    const newCondicionada = {
      ...modulo.condicionada,
      condiciones: newCondiciones
    };
    
    actualizarModulo(moduloId, { condicionada: newCondicionada });
  };

  const handleDragStart = (e, tipo, datos) => {
    setArrastrando({ tipo, datos });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropModulo = (e, index) => {
    e.preventDefault();
    if (!arrastrando || arrastrando.tipo !== 'modulo') return;
    const modulosNuevos = [...modulos];
    const [moduloMovido] = modulosNuevos.splice(arrastrando.datos.index, 1);
    modulosNuevos.splice(index, 0, moduloMovido);
    setModulos(modulosNuevos);
    setArrastrando(null);
  };

  const handleDropPregunta = (e, moduloId, indexPregunta) => {
    e.preventDefault();
    e.stopPropagation();
    if (!arrastrando || arrastrando.tipo !== 'pregunta') return;

    const { moduloId: moduloOrigen, index } = arrastrando.datos;
    
    if (moduloOrigen === moduloId) {
      const moduloActual = modulos.find(m => m.id === moduloId);
      const preguntasNuevas = [...moduloActual.preguntas];
      const [preguntaMovida] = preguntasNuevas.splice(index, 1);
      preguntasNuevas.splice(indexPregunta, 0, preguntaMovida);
      setModulos(modulos.map(m =>
        m.id === moduloId ? { ...m, preguntas: preguntasNuevas } : m
      ));
    } else {
      const moduloOrigenObj = modulos.find(m => m.id === moduloOrigen);
      const preguntaMovida = moduloOrigenObj.preguntas[index];
      
      setModulos(modulos.map(m => {
        if (m.id === moduloOrigen) {
          return { ...m, preguntas: m.preguntas.filter((_, i) => i !== index) };
        }
        if (m.id === moduloId) {
          const nuevasPreguntas = [...m.preguntas];
          nuevasPreguntas.splice(indexPregunta, 0, preguntaMovida);
          return { ...m, preguntas: nuevasPreguntas };
        }
        return m;
      }));
    }
    setArrastrando(null);
  };

  // Continuará con renderPregunta y el resto del componente...
  // Debido al límite de caracteres, necesito dividir esto

  const handleQuestionClick = (pregunta) => {
    setExpandida(`pregunta-${pregunta.id}`);
    setExpandidaModulos({ ...expandidaModulos, [pregunta.moduloId]: true });
    setIndiceAbierto(false);
    setBusquedaIndice('');
    setTimeout(() => {
      const elemento = document.querySelector(`[data-pregunta-card="pregunta-${pregunta.id}"]`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleOpenTypeSelector = (moduloId, preguntaId) => {
    const pregunta = modulos.find(m => m.id === moduloId)?.preguntas.find(p => p.id === preguntaId);
    setModalSelectorTipo({ moduloId, preguntaId, tipoActual: pregunta?.tipo, pregunta });
  };

  const handleSelectType = (tipo) => {
    if (!modalSelectorTipo) return;
    
    const nuevasIndicaciones = getIndicacionesPorDefecto(tipo.value);
    
    // Si estamos editando desde el modal de pregunta, actualizar el estado externo
    if (modalEditarPregunta) {
      setExternalUpdateForQuestion({ 
        tipo: tipo.value,
        indicaciones: nuevasIndicaciones
      });
      // Limpiar después de un breve delay para que el efecto se ejecute
      setTimeout(() => setExternalUpdateForQuestion(null), 100);
    } else {
      // Actualización directa (no debería ocurrir en el flujo actual, pero por si acaso)
      const { moduloId, preguntaId } = modalSelectorTipo;
      actualizarPregunta(moduloId, preguntaId, { 
        tipo: tipo.value,
        indicaciones: nuevasIndicaciones
      });
    }
    
    setModalSelectorTipo(null);
    setBusquedaModalTipo('');
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-[color:var(--background)] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--primary)] mx-auto mb-4"></div>
            <p className="text-[color:var(--text-secondary)]">Cargando encuesta...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[color:var(--background)] text-[color:var(--text-primary)] p-3 md:p-8">
      <div className="max-w-3xl mx-auto w-full">
        <FormHeader
          titulo={titulo}
          setTitulo={setTitulo}
          descripcion={descripcion}
          setDescripcion={setDescripcion}
          tituloFocused={tituloFocused}
          setTituloFocused={setTituloFocused}
          indiceHistorial={indiceHistorial}
          historial={historial}
          deshacer={deshacer}
          rehacer={rehacer}
          modulos={modulos}
          indiceAbierto={indiceAbierto}
          setIndiceAbierto={setIndiceAbierto}
          busquedaIndice={busquedaIndice}
          setBusquedaIndice={setBusquedaIndice}
          obtenerTodasLasPreguntas={obtenerTodasLasPreguntas}
          onQuestionClick={handleQuestionClick}
        />

        {modulos.length === 0 && (
          <div className="bg-[color:var(--card-background)] rounded-lg p-4 md:p-6 shadow-lg mb-6 border border-[color:var(--card-border)]">
            <button
              onClick={() => setModalNuevoModulo(true)}
              className="w-full py-3 rounded border-2 border-dashed border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white font-medium transition-all flex items-center justify-center gap-2 text-sm"
            >
              <FolderPlus size={16} /> Crear primer módulo
            </button>
          </div>
        )}

        {modulos.length > 0 && (
          <div className="bg-[color:var(--card-background)] rounded-lg p-4 md:p-6 shadow-lg border border-[color:var(--card-border)] mb-6">
            <div className="mb-4">
              <span className="text-xs text-[color:var(--text-secondary)]">{modulos.length} módulo{modulos.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-3 mb-4">
              {modulos.map((modulo, moduloIdx) => (
                <ModuleCard
                  key={modulo.id}
                  modulo={modulo}
                  moduloIdx={moduloIdx}
                  expandidaModulos={expandidaModulos}
                  arrastrando={arrastrando}
                  handleDragStart={handleDragStart}
                  handleDragOver={handleDragOver}
                  handleDropModulo={handleDropModulo}
                  handleDropPregunta={handleDropPregunta}
                  renombrarModulo={renombrarModulo}
                  actualizarDescripcionModulo={actualizarDescripcionModulo}
                  setExpandidaModulos={setExpandidaModulos}
                  setModuloDinamizandose={setModuloDinamizandose}
                  setModuloCondicionandose={setModuloCondicionandose}
                  eliminarModulo={confirmarEliminarModulo}
                  setModulos={setModulos}
                  modulos={modulos}
                  agregarPregunta={agregarPregunta}
                  tiposPreguntas={tiposPreguntas}
                  generarValue={generarValue}
                  actualizarPregunta={actualizarPregunta}
                  eliminarPregunta={confirmarEliminarPregunta}
                  setArrastrando={setArrastrando}
                  onEditQuestion={abrirModalEditarPregunta}
                />
              ))}
            </div>

            <button
              onClick={() => setModalNuevoModulo(true)}
              className="w-full py-2 rounded-lg border-2 border-dashed border-[color:var(--primary)] text-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:text-white font-medium transition-all flex items-center justify-center gap-2 text-sm"
            >
              <FolderPlus size={16} /> Nuevo módulo
            </button>
          </div>
        )}

        <NewModuleModal
          isOpen={modalNuevoModulo}
          onClose={() => {
            setModalNuevoModulo(false);
            setNombreModulo('');
          }}
          onConfirm={agregarModulo}
          moduleName={nombreModulo}
          setModuleName={setNombreModulo}
          modulosLength={modulos.length}
        />

        <TypeSelectorModal
          isOpen={modalSelectorTipo !== null}
          onClose={() => {
            setModalSelectorTipo(null);
            setBusquedaModalTipo('');
          }}
          onSelect={handleSelectType}
          tiposPreguntas={tiposPreguntas}
          tipoActual={modalSelectorTipo?.tipoActual}
          busqueda={busquedaModalTipo}
          setBusqueda={setBusquedaModalTipo}
        />

        <QuestionEditorModal
          isOpen={modalEditarPregunta !== null}
          onClose={cerrarModalEditarPregunta}
          pregunta={getPreguntaActual()}
          moduloId={modalEditarPregunta?.moduloId}
          onSave={guardarPreguntaDesdeModal}
          tiposPreguntas={tiposPreguntas}
          externalUpdate={externalUpdateForQuestion}
          onOpenTypeSelector={() => {
            if (modalEditarPregunta) {
              const preguntaActual = getPreguntaActual();
              setModalSelectorTipo({
                moduloId: modalEditarPregunta.moduloId,
                preguntaId: modalEditarPregunta.preguntaId,
                tipoActual: preguntaActual?.tipo
              });
            }
          }}
        />

        <ConfirmModal
          isOpen={modalConfirmEliminar !== null}
          onClose={() => setModalConfirmEliminar(null)}
          onConfirm={() => {
            if (modalConfirmEliminar?.tipo === 'modulo') {
              eliminarModulo(modalConfirmEliminar.data.moduloId);
            } else if (modalConfirmEliminar?.tipo === 'pregunta') {
              eliminarPregunta(modalConfirmEliminar.data.moduloId, modalConfirmEliminar.data.preguntaId);
            }
          }}
          title={
            modalConfirmEliminar?.tipo === 'modulo'
              ? '¿Eliminar módulo?'
              : '¿Eliminar pregunta?'
          }
          message={
            modalConfirmEliminar?.tipo === 'modulo'
              ? `Se eliminará el módulo "${modalConfirmEliminar?.data.nombre}" y todas sus preguntas. Esta acción no se puede deshacer.`
              : `Se eliminará la pregunta "${modalConfirmEliminar?.data.texto || 'sin texto'}". Esta acción no se puede deshacer.`
          }
          confirmText="Eliminar"
          cancelText="Cancelar"
        />

        {/* Botones de acción */}
        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => {
              if (modulos.some(m => m.preguntas && m.preguntas.length > 0)) {
                const confirmar = window.confirm("¿Estás seguro? Se perderá el trabajo realizado si sales sin guardar.");
                if (!confirmar) return;
              }
              router.push('/dashboard/temporal');
            }}
            className="flex-1 px-6 py-2 rounded-lg border-2 border-[color:var(--card-border)] text-[color:var(--text-secondary)] hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)] font-medium transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              // Validar que tenga título
              if (!titulo.trim()) {
                toast.error("Debes ingresar un título para la encuesta");
                return;
              }
              
              // Validar que tenga al menos una pregunta
              const tienePreguntas = modulos.some(m => m.preguntas && m.preguntas.length > 0);
              if (!tienePreguntas) {
                toast.error("Debes crear al menos una pregunta");
                return;
              }
              
              try {
                setIsSaving(true);
                
                // Importar funciones necesarias
                const { prepareDataForBackend } = await import('../utils/transformToSurveyJS');
                
                // Si estamos editando, cargar configuración existente
                // Para encuestas NUEVAS, NO poner fechas (deben ir a "Pendientes")
                let configData = {
                  fechaInicio: '',  // ← Vacío para encuestas nuevas
                  fechaFin: '',     // ← Vacío para encuestas nuevas
                  metaTotal: 0,
                  gpsObligatorio: false,
                  tieneObjetivo: false,
                  cuotasActivas: false,
                  categorias: [],
                  encuestadoresIds: [],
                  supervisoresIds: []
                };

                // Si es edición, cargar datos existentes
                if (surveyId) {
                  try {
                    const existing = await surveyService.getSurvey(surveyId);
                    const existingInfo = existing?.survey?.surveyInfo || {};
                    configData = {
                      fechaInicio: existingInfo.startDate || configData.fechaInicio,
                      fechaFin: existingInfo.endDate || configData.fechaFin,
                      metaTotal: existingInfo.target || 0,
                      gpsObligatorio: existingInfo.requireGps || false,
                      tieneObjetivo: (existingInfo.target || 0) > 0,
                      cuotasActivas: (existingInfo.quotas || []).length > 0,
                      categorias: existingInfo.quotas || [],
                      encuestadoresIds: existingInfo.userIds || [],
                      supervisoresIds: existingInfo.supervisorsIds || []
                    };
                  } catch (e) {
                    console.warn('No se pudo cargar configuración existente:', e);
                  }
                }
                
                // Preparar datos completos
                const dataToSave = prepareDataForBackend({
                  titulo,
                  descripcion,
                  modulos,
                  ...configData
                });
                
                console.log("📤 Datos a guardar:", dataToSave);
                console.log("📤 Estructura de survey:", dataToSave.survey);
                console.log("📤 Estructura de surveyInfo:", dataToSave.surveyInfo);
                
                // Guardar en backend (crear o actualizar)
                const response = await surveyService.createOrUpdateSurvey(
                  dataToSave, 
                  surveyId || null, 
                  true // isDraft = true
                );
                
                console.log("✅ Respuesta COMPLETA del backend:", response);
                console.log("✅ Estructura de response:", {
                  survey: response?.survey,
                  srv: response?.srv,
                  _id: response?._id,
                  id: response?.id,
                  message: response?.message,
                  error: response?.error
                });
                
                // El backend devuelve el ID en response.srv._id
                const savedId = response?.srv?._id || response?.survey?._id || response?._id;
                console.log("🆔 ID de encuesta guardada:", savedId);
                console.log("📋 Status de encuesta guardada:", response?.srv?.status || response?.survey?.status || response?.status);
                
                // Verificar inmediatamente si la encuesta está en el backend
                try {
                  const user = JSON.parse(localStorage.getItem("user"));
                  console.log("👤 Usuario actual:", user._id);
                  
                  // Esperar un momento para que el backend procese
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Traer todas las encuestas del usuario
                  const allSurveys = await surveyService.getAllSurveys(1, 100);
                  console.log("🔍 Total de encuestas después de guardar:", allSurveys?.surveys?.length);
                  console.log("🔍 IDs de encuestas:", allSurveys?.surveys?.map(s => s._id || s.id));
                } catch (e) {
                  console.error("Error verificando encuestas:", e);
                }
                
                toast.success(
                  surveyId
                    ? "Encuesta actualizada correctamente"
                    : "Encuesta creada correctamente"
                );
                router.push('/dashboard/temporal');
              } catch (error) {
                console.error("❌ Error completo al guardar:", error);
                console.error("❌ Tipo de error:", error.constructor.name);
                console.error("❌ Message:", error.message);
                console.error("❌ Stack:", error.stack);
                
                // Mostrar error más detallado
                let errorMessage = error.message || "Error desconocido";
                
                toast.error(`Error al guardar la encuesta: ${errorMessage}`);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="flex-1 px-6 py-2 rounded-lg bg-[color:var(--primary)] hover:opacity-90 text-white font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

