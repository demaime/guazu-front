/**
 * Transformador de datos: Estructura Temporal → Formato SurveyJS/Backend
 * 
 * Este archivo contiene las funciones necesarias para convertir la estructura
 * de datos del creador temporal al formato que espera el backend.
 */

/**
 * Mapea un tipo de pregunta temporal al tipo equivalente en SurveyJS
 */
function mapQuestionType(tipoTemporal) {
  const typeMap = {
    'texto': 'text',
    'texto-multiple': 'paneldynamic',
    'numerica': 'text',
    'opcion-unica': 'radiogroup',
    'opcion-multiple': 'checkbox',
    'desplegable': 'dropdown',
    'matriz': 'matrix',
    'matriz-multiple': 'matrix',
    'matriz-dinamica': 'matrixdynamic',
    'escala': 'rating', // o 'radiogroup' según configuración
    'ordenar': 'ranking',
    'fecha': 'text',
    'foto': 'file',
    'microfono': 'file',
    'cuota-genero': 'radiogroup',
    'cuota-edad': 'radiogroup'
  };

  return typeMap[tipoTemporal] || 'text';
}

/**
 * Transforma una pregunta temporal individual a formato SurveyJS
 */
function transformPregunta(pregunta, preguntaIdToValue = {}) {
  const element = {
    type: mapQuestionType(pregunta.tipo),
    name: pregunta.value || `pregunta_${pregunta.id}`,
    title: pregunta.text || "",
    description: pregunta.indicaciones || "",
    isRequired: pregunta.requerida || false
  };

  // Configurar según el tipo de pregunta
  switch (pregunta.tipo) {
    case 'texto':
      // Simple text input
      break;

    case 'numerica':
      element.inputType = 'number';
      break;

    case 'fecha':
      element.inputType = 'date';
      break;

    case 'opcion-unica':
    case 'opcion-multiple':
    case 'desplegable':
    case 'ordenar':
    case 'cuota-genero':
    case 'cuota-edad':
      // Convertir opciones a formato SurveyJS
      if (pregunta.opciones && Array.isArray(pregunta.opciones)) {
        element.choices = pregunta.opciones.map(opt => ({
          value: opt.value,
          text: opt.text
        }));
      }
      
      // Configuración adicional para desplegable
      if (pregunta.tipo === 'desplegable') {
        element.choicesSearchEnabled = true;
      }
      break;

    case 'escala': {
      // Escala puede ser rating o radiogroup según configuración
      const config = pregunta.configuracionEscala || {};
      
      if (config.modo === 'predefinida' || config.puntos) {
        element.type = 'rating';
        element.rateMin = 1;
        element.rateMax = config.puntos || 5;
        element.minRateDescription = config.extremoIzquierdo || '';
        element.maxRateDescription = config.extremoDerecho || '';
      } else if (config.opciones && config.opciones.length > 0) {
        // Si tiene opciones específicas, usar radiogroup
        element.type = 'radiogroup';
        element.choices = config.opciones.map(opt => ({
          value: opt.value,
          text: opt.text
        }));
      }
      break;
    }

    case 'matriz':
    case 'matriz-multiple':
      element.columns = (pregunta.columnas || []).map(col => ({
        value: col.value,
        text: col.text
      }));
      element.rows = (pregunta.filas || []).map(fila => ({
        value: fila.value,
        text: fila.text
      }));
      element.cellType = pregunta.tipo === 'matriz-multiple' ? 'checkbox' : 'radiogroup';
      break;

    case 'matriz-dinamica':
      element.columns = (pregunta.columnas || []).map(col => ({
        name: col.value,
        title: col.text,
        cellType: col.cellType || 'text'
      }));
      element.rowCount = 1;
      element.minRowCount = 1;
      element.addRowText = 'Agregar fila';
      element.removeRowText = 'Eliminar';
      break;

    case 'texto-multiple':
      // Panel dinámico con campos múltiples
      if (pregunta.campos && Array.isArray(pregunta.campos)) {
        element.templateElements = pregunta.campos.map(campo => ({
          type: campo.tipo === 'textarea' ? 'comment' : 'text',
          name: campo.value,
          title: campo.label,
          inputType: campo.tipo !== 'textarea' ? campo.tipo : undefined
        }));
        element.panelCount = 1;
        element.minPanelCount = 1;
        element.panelAddText = 'Agregar';
        element.panelRemoveText = 'Eliminar';
      }
      break;

    case 'foto':
      element.acceptedTypes = 'image/*';
      element.storeDataAsText = false;
      element.maxSize = 5242880; // 5MB
      break;

    case 'microfono':
      element.acceptedTypes = 'audio/*';
      element.storeDataAsText = false;
      element.maxSize = 10485760; // 10MB
      break;
  }

  // Procesar validadores si existen
  if (pregunta.validadores?.activo && pregunta.validadores.reglas?.length > 0) {
    const validators = pregunta.validadores.reglas
      .map((regla) => {
        if (regla.tipo === 'rango') {
          const v = { type: 'numeric' };
          if (regla.min !== '' && regla.min !== undefined) v.minValue = Number(regla.min);
          if (regla.max !== '' && regla.max !== undefined) v.maxValue = Number(regla.max);
          if (regla.mensaje) v.text = regla.mensaje;
          return v;
        }
        if (regla.tipo === 'comparacion') {
          const otherRef =
            regla.compararConTipo === 'pregunta'
              ? `{${preguntaIdToValue[regla.compararConPreguntaId] || regla.compararConPreguntaId}}`
              : regla.compararConValor;
          if (!otherRef) return null;
          return {
            type: 'expression',
            expression: `{${element.name}} ${regla.operador} ${otherRef}`,
            text: regla.mensaje || undefined,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (validators.length > 0) {
      element.validators = validators;
    }
  }

  // Procesar condiciones si existen
  if (pregunta.condicionada?.activa && pregunta.condicionada.condiciones?.length > 0) {
    // Usar la función generarVisibleIf para mantener consistencia
    const visibleIfExpression = generarVisibleIf(pregunta.condicionada, preguntaIdToValue);
    if (visibleIfExpression) {
      element.visibleIf = visibleIfExpression;
    }
  }

  return element;
}

/**
 * Genera expresión visibleIf a partir de condiciones
 * @param {Object} condicionada - Objeto con condiciones
 * @param {Object} preguntaIdToValue - Mapa de ID de pregunta a su value (name en SurveyJS)
 */
function generarVisibleIf(condicionada, preguntaIdToValue = {}) {
  if (!condicionada?.activa || !condicionada.condiciones?.length) {
    return null;
  }

  const conditions = condicionada.condiciones.map(cond => {
    if (!cond.preguntaId) return '';
    
    // Obtener el value de la pregunta (name en SurveyJS) usando el mapa
    const preguntaValue = preguntaIdToValue[cond.preguntaId] || cond.preguntaId;
    const preguntaRef = `{${preguntaValue}}`;
    
    // Condición numérica entre
    if (cond.operador === 'entre' && cond.valorMin !== '' && cond.valorMax !== '') {
      return `(${preguntaRef} >= ${cond.valorMin} and ${preguntaRef} <= ${cond.valorMax})`;
    }
    
    // Condiciones numéricas mayor/menor
    if (['mayor', 'menor'].includes(cond.operador) && cond.valorMin !== '') {
      const op = cond.operador === 'mayor' ? '>' : '<';
      return `${preguntaRef} ${op} ${cond.valorMin}`;
    }
    
    // Condiciones con valores (opciones)
    if (Array.isArray(cond.valores) && cond.valores.length > 0) {
      // Operador "contiene alguna" - para checkbox, al menos una opción debe estar seleccionada
      if (cond.operador === 'contiene-alguna') {
        return `(${cond.valores.map(v => `${preguntaRef} contains '${v}'`).join(' or ')})`;
      }
      
      // Operador "contiene todas" - para checkbox, todas las opciones deben estar seleccionadas
      if (cond.operador === 'contiene-todas') {
        return `(${cond.valores.map(v => `${preguntaRef} contains '${v}'`).join(' and ')})`;
      }
      
      // Operador "no contiene ninguna" - para checkbox, ninguna de las opciones debe estar seleccionada
      // Usamos nocontains o negación con contains
      if (cond.operador === 'no-contiene-ninguna') {
        // Generar: NOT (contiene A OR contiene B OR contiene C)
        const containsConditions = cond.valores.map(v => `${preguntaRef} contains '${v}'`).join(' or ');
        return `!(${containsConditions})`;
      }
      
      // Operador "igual" - para single choice o para checkbox con comparación exacta
      if (cond.operador === 'igual') {
        // Para single choice, comparar con cada valor usando OR
        return `(${cond.valores.map(v => `${preguntaRef} = '${v}'`).join(' or ')})`;
      }
      
      // Operador "diferente"
      if (cond.operador === 'diferente') {
        return `(${cond.valores.map(v => `${preguntaRef} != '${v}'`).join(' and ')})`;
      }
    }
    
    return '';
  }).filter(c => c);

  // Usar la lógica configurada (and/or), por defecto 'and'
  const logica = condicionada.logica || 'and';
  return conditions.length > 0 ? conditions.join(` ${logica} `) : null;
}

/**
 * Transforma los módulos a páginas de SurveyJS
 * Cada pregunta obtiene su propia página para paginación correcta
 * Las condiciones del módulo se aplican a nivel de página
 */
export function transformModulosToSurveyJS(modulos) {
  if (!Array.isArray(modulos) || modulos.length === 0) {
    return [];
  }

  // Crear mapa de ID de pregunta a su value (name en SurveyJS)
  const preguntaIdToValue = {};
  modulos.forEach(modulo => {
    if (modulo.preguntas && Array.isArray(modulo.preguntas)) {
      modulo.preguntas.forEach(pregunta => {
        preguntaIdToValue[pregunta.id] = pregunta.value || `pregunta_${pregunta.id}`;
      });
    }
  });

  const pages = [];

  modulos.forEach((modulo) => {
    if (!modulo.preguntas || !Array.isArray(modulo.preguntas) || modulo.preguntas.length === 0) {
      return;
    }

    // Transformar las preguntas del módulo
    const preguntasTransformadas = modulo.preguntas.map(pregunta => transformPregunta(pregunta, preguntaIdToValue));

    // Verificar si el módulo tiene condiciones activas
    const visibleIfModulo = generarVisibleIf(modulo.condicionada, preguntaIdToValue);

    // Crear una página por cada pregunta
    preguntasTransformadas.forEach((pregunta, idx) => {
      const page = {
        name: `page_${modulo.id}_${idx}`,
        elements: [pregunta]
      };

      // Agregar título del módulo (se mostrará arriba de cada pregunta del módulo)
      if (modulo.nombre) {
        page.title = modulo.nombre;
      }

      // Agregar descripción del módulo (se mostrará debajo del título)
      if (modulo.descripcion) {
        page.description = modulo.descripcion;
      }

      // Si el módulo tiene condiciones, aplicarlas a la página
      if (visibleIfModulo) {
        page.visibleIf = visibleIfModulo;
      }

      pages.push(page);
    });
  });

  return pages;
}

/**
 * Transformador inverso: SurveyJS → módulos del editor temporal
 * Esto permite reabrir encuestas antiguas aunque no tengan surveyDefinition persistido.
 */
function mapSurveyJSTypeToTemporalType(element) {
  const type = element?.type;
  if (type === "text") {
    return element?.inputType === "number" ? "numerica" : element?.inputType === "date" ? "fecha" : "texto";
  }
  if (type === "comment") return "texto";
  if (type === "radiogroup") return "opcion-unica";
  if (type === "checkbox") return "opcion-multiple";
  if (type === "dropdown") return "desplegable";
  if (type === "rating") return "escala";
  if (type === "ranking") return "ordenar";
  if (type === "matrix") return "matriz";
  if (type === "matrixdynamic") return "matriz-dinamica";
  if (type === "paneldynamic") return "texto-multiple";
  if (type === "file") {
    const accepted = String(element?.acceptedTypes || "");
    if (accepted.includes("audio")) return "microfono";
    if (accepted.includes("image")) return "foto";
    return "foto";
  }
  return "texto";
}

function extractText(val) {
  if (!val) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.default || val.es || Object.values(val)[0] || "";
  }
  return String(val);
}

function elementToPregunta(element, idx) {
  const tipo = mapSurveyJSTypeToTemporalType(element);
  const preguntaId = element?.name || `pregunta_${idx + 1}`;
  const base = {
    id: preguntaId,
    value: element?.name || preguntaId,
    text: extractText(element?.title),
    tipo,
    indicaciones: extractText(element?.description),
    requerida: !!element?.isRequired,
  };

  if (tipo === "opcion-unica" || tipo === "opcion-multiple" || tipo === "desplegable" || tipo === "ordenar") {
    const choices = Array.isArray(element?.choices) ? element.choices : [];
    base.opciones = choices.map((c, i) => ({
      id: `${preguntaId}_opt_${i}`,
      value: c?.value ?? c,
      text: extractText(c?.text) || String(c?.value ?? c ?? ""),
    }));
  }

  if (tipo === "matriz" || tipo === "matriz-dinamica") {
    // Matrix
    if (Array.isArray(element?.rows)) {
      base.filas = element.rows.map((r, i) => ({
        id: `${preguntaId}_fila_${i}`,
        value: r?.value ?? r,
        text: extractText(r?.text) || String(r?.value ?? r ?? ""),
      }));
    }
    if (Array.isArray(element?.columns)) {
      // columns puede ser [{value,text}] o [{name,title}]
      base.columnas = element.columns.map((c, i) => ({
        id: `${preguntaId}_col_${i}`,
        value: c?.value ?? c?.name ?? c,
        text: extractText(c?.text ?? c?.title) || String(c?.value ?? c?.name ?? c ?? ""),
      }));
    }
  }

  if (tipo === "escala") {
    base.configuracionEscala = {
      modo: "predefinida",
      puntos: element?.rateMax ?? 5,
      extremoIzquierdo: element?.minRateDescription || "",
      extremoDerecho: element?.maxRateDescription || "",
      opciones: [],
    };
  }

  if (tipo === "texto-multiple") {
    const template = Array.isArray(element?.templateElements) ? element.templateElements : [];
    base.campos = template.map((t, i) => ({
      id: `${preguntaId}_campo_${i}`,
      value: t?.name || `${preguntaId}_campo_${i}`,
      label: t?.title || "",
      tipo: t?.type === "comment" ? "textarea" : (t?.inputType || "text"),
    }));
  }

  // Nota: condiciones (visibleIf) podrían mapearse en el futuro a `condicionada`
  return base;
}

export function transformSurveyJSToModulos(survey) {
  const pages = Array.isArray(survey?.pages) ? survey.pages : [];
  
  if (pages.length === 0) return [];

  // Extraer todas las preguntas de todas las páginas
  const allQuestions = [];
  pages.forEach((page) => {
    if (Array.isArray(page?.elements)) {
      page.elements.forEach((el) => {
        allQuestions.push(el);
      });
    }
  });

  if (allQuestions.length === 0) return [];

  return [
    {
      id: "modulo_1",
      nombre: "Módulo 1",
      descripcion: "",
      preguntas: allQuestions.map((el, idx) => elementToPregunta(el, idx)),
    },
  ];
}

/**
 * Transforma una categoría de cuotas al formato del backend
 */
function transformCategoria(categoria) {
  return {
    category: categoria.nombre,
    segments: (categoria.segmentos || []).map(seg => ({
      name: seg.nombre,
      target: seg.objetivo || 0,
      current: 0
    }))
  };
}

/**
 * Prepara todos los datos para enviar al backend
 * 
 * @param {Object} surveyData - Datos del contexto temporal
 * @returns {Object} - Objeto formateado para el backend
 */
export function prepareDataForBackend(surveyData) {
  // Detectar preguntas de cuota
  const preguntasCuota = [];
  surveyData.modulos?.forEach(modulo => {
    modulo.preguntas?.forEach(pregunta => {
      if (pregunta.tipo === 'cuota-genero' || pregunta.tipo === 'cuota-edad') {
        preguntasCuota.push(pregunta);
      }
    });
  });

  // Generar quotaMetadata si hay preguntas de cuota
  let quotaMetadata = null;
  let metaMode = 'casos';
  
  if (preguntasCuota.length > 0) {
    metaMode = 'cuotas';
    quotaMetadata = {
      type: preguntasCuota.length === 2 ? 'combined' : 'simple',
      dimensions: preguntasCuota.map(p => ({
        category: p.tipo === 'cuota-genero' ? 'género' : 'edad',
        questionId: p.id,
        options: (p.opciones || []).map(opt => opt.value)
      }))
    };
  }

  // 1. Crear formato SurveyJS
  const surveyJSFormat = {
    locale: "es",
    title: surveyData.titulo || "Encuesta sin título",
    description: surveyData.descripcion || "",
    pages: transformModulosToSurveyJS(surveyData.modulos || []),
    showProgressBar: "top",
    progressBarType: "questions",
    showPrevButton: true,
    showQuestionNumbers: "on",
    completeText: "Finalizar",
    pageNextText: "Siguiente",
    pagePrevText: "Anterior",
    requiredText: "(*) Pregunta obligatoria.",
    requiredErrorText: "Por favor responda la pregunta.",
    questionsOrder: "initial",
    clearInvisibleValues: "onHidden",
    checkErrorsMode: "onNextPage"
  };

  // 2. Preparar información de la encuesta
  const surveyInfo = {
    startDate: surveyData.fechaInicio || '',  // Dejar vacío si no hay fecha
    endDate: surveyData.fechaFin || '',       // Dejar vacío si no hay fecha
    target: surveyData.metaTotal || 0,
    requireGps: surveyData.gpsObligatorio || false,
    userIds: surveyData.encuestadoresIds || [],
    supervisorsIds: surveyData.supervisoresIds || [],
    
    // Nuevos campos para cuotas
    metaMode: metaMode,
    quotaMetadata: quotaMetadata,
    quotaAssignments: [], // Se llenará en configuración
    
    // Mantener compatibilidad con sistema antiguo
    quotas: (surveyData.categorias || []).map(transformCategoria),
    pollsterAssignments: [],
    location: "" // Agregar campo vacío por defecto
  };

  // 3. Preparar datos de participantes
  const participants = {
    userIds: surveyData.encuestadoresIds || [],
    supervisorsIds: surveyData.supervisoresIds || [],
    pollsterAssignments: [],
    quotaAssignments: []
  };

  // 4. Retornar estructura completa para el backend
  return {
    survey: surveyJSFormat,
    surveyDefinition: surveyData,
    surveyInfo: surveyInfo,
    participants: participants
  };
}

/**
 * Valida que los datos estén completos antes de guardar
 */
export function validateSurveyData(surveyData) {
  const errors = [];

  if (!surveyData.titulo || surveyData.titulo.trim() === '') {
    errors.push('El título es obligatorio');
  }

  if (!surveyData.modulos || surveyData.modulos.length === 0) {
    errors.push('Debe agregar al menos un módulo');
  } else {
    const tienePreguntas = surveyData.modulos.some(m => m.preguntas && m.preguntas.length > 0);
    if (!tienePreguntas) {
      errors.push('Debe agregar al menos una pregunta');
    }
  }

  if (!surveyData.fechaInicio || !surveyData.fechaFin) {
    errors.push('Las fechas de inicio y fin son obligatorias');
  }

  if (surveyData.tieneObjetivo && (!surveyData.metaTotal || surveyData.metaTotal <= 0)) {
    errors.push('La meta debe ser mayor a 0');
  }

  if (!surveyData.encuestadoresIds || surveyData.encuestadoresIds.length === 0) {
    errors.push('Debe seleccionar al menos un encuestador');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

