// Placeholder para evitar errores de build.
// Implementar la lógica de migración de lógica condicional aquí si es necesario.

export default function conditionalLogicMigration(data) {
  // Por ahora, retorna los datos sin modificar
  return data;
}

// Detecta el formato de las preguntas: 'legacy', 'new' o 'mixed'
export function detectSurveyFormat(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return "new";
  const hasShowCondition = questions.some((q) => q.showCondition);
  const hasNextQuestionId = questions.some(
    (q) => q.options && q.options.some((opt) => opt.nextQuestionId)
  );
  if (hasShowCondition && !hasNextQuestionId) return "new";
  if (!hasShowCondition && hasNextQuestionId) return "legacy";
  if (hasShowCondition && hasNextQuestionId) return "mixed";
  return "new";
}

// Determina si es necesario migrar (si hay preguntas legacy)
export function needsMigration(questions) {
  return (
    detectSurveyFormat(questions) === "legacy" ||
    detectSurveyFormat(questions) === "mixed"
  );
}

// Migra preguntas de formato legacy a formato nuevo
export function migrateSurveyToNewFormat(questions) {
  if (!Array.isArray(questions)) return [];
  // Copia profunda para no mutar el original
  const migrated = questions.map((q) => JSON.parse(JSON.stringify(q)));

  // Map de preguntas por id para lookup rápido
  const questionMap = {};
  migrated.forEach((q) => {
    questionMap[q.id] = q;
  });

  // Para cada pregunta legacy condicional, migrar la lógica a showCondition en la hija
  migrated.forEach((parentQ) => {
    if (parentQ.options && Array.isArray(parentQ.options)) {
      parentQ.options.forEach((opt) => {
        if (opt.nextQuestionId) {
          const childQ = questionMap[opt.nextQuestionId];
          if (childQ) {
            // Migrar a showCondition en la hija
            childQ.showCondition = {
              parentQuestionId: parentQ.id,
              requiredValue: opt.text,
              operator: "equals",
              logicType: "AND",
            };
          }
        }
      });
    }
  });

  // Limpiar nextQuestionId de las opciones (ya migrado)
  migrated.forEach((q) => {
    if (q.options && Array.isArray(q.options)) {
      q.options = q.options.map((opt) => {
        // Eliminar nextQuestionId si existe, sin asignarla a una variable
        const optCopy = { ...opt };
        delete optCopy.nextQuestionId;
        return optCopy;
      });
    }
  });

  return migrated;
}
