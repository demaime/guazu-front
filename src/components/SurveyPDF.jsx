"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Logo en base64
const LOGO_BASE64 =
  "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";

// Estilos del PDF usando la paleta de colores del globals.css
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Helvetica",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: "2px solid #3f51b5",
  },
  logo: {
    width: 100,
    height: 30,
  },
  headerDate: {
    fontSize: 10,
    color: "#64748b",
  },

  // Título principal
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3f51b5",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    color: "#1e293b",
    marginBottom: 25,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Información básica
  infoSection: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 5,
    border: "1px solid #e2e8f0",
    marginBottom: 25,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3f51b5",
    marginBottom: 10,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 11,
    color: "#1e293b",
    marginTop: 2,
  },

  // Sección de preguntas
  questionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3f51b5",
    marginBottom: 20,
    textAlign: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 5,
  },

  // Pregunta individual
  questionContainer: {
    marginBottom: 20,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 5,
    padding: 12,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  questionNumber: {
    backgroundColor: "#3f51b5",
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    padding: 6,
    borderRadius: 15,
    textAlign: "center",
    minWidth: 30,
    marginRight: 10,
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    lineHeight: 1.4,
  },
  questionRequired: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "bold",
    marginLeft: 5,
  },

  // Metadatos de la pregunta
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 40,
    marginBottom: 8,
  },
  questionType: {
    fontSize: 9,
    color: "#6366f1",
    backgroundColor: "#f1f5f9",
    padding: "3 8",
    borderRadius: 10,
    fontWeight: "bold",
  },
  questionDescription: {
    fontSize: 10,
    color: "#64748b",
    marginLeft: 40,
    marginBottom: 10,
    fontStyle: "italic",
  },

  // Pregunta condicional
  conditionalBadge: {
    backgroundColor: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: 5,
    padding: 8,
    marginLeft: 40,
    marginBottom: 10,
  },
  conditionalTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 3,
  },
  conditionalText: {
    fontSize: 10,
    color: "#78350f",
  },

  // Opciones de respuesta
  optionsContainer: {
    marginLeft: 40,
    marginTop: 8,
  },
  optionsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 6,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingLeft: 10,
  },
  optionBullet: {
    width: 6,
    height: 6,
    backgroundColor: "#3f51b5",
    borderRadius: 3,
    marginRight: 8,
  },
  optionText: {
    fontSize: 10,
    color: "#1e293b",
    flex: 1,
  },
  optionConditional: {
    fontSize: 9,
    color: "#2563eb",
    fontWeight: "bold",
    marginLeft: 5,
  },

  // Matriz (filas y columnas)
  matrixContainer: {
    marginLeft: 40,
    marginTop: 8,
  },
  matrixSection: {
    marginBottom: 10,
  },
  matrixLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  matrixItem: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
    paddingLeft: 15,
  },

  // Preguntas relacionadas
  relatedQuestionsContainer: {
    backgroundColor: "#dbeafe",
    border: "1px solid #3b82f6",
    borderRadius: 5,
    padding: 10,
    marginLeft: 40,
    marginTop: 10,
  },
  relatedTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 6,
  },
  relatedItem: {
    fontSize: 9,
    color: "#1e40af",
    marginBottom: 3,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: "#64748b",
  },
});

// Mapeo de tipos de pregunta a español
const QUESTION_TYPES_ES = {
  text: "Texto",
  multiple_choice: "Opción Múltiple",
  single_choice: "Opción Única",
  checkbox: "Casillas de Verificación",
  rating: "Calificación",
  date: "Fecha",
  time: "Hora",
  email: "Correo Electrónico",
  number: "Número",
  phone: "Teléfono",
  matrix: "Matriz",
};

// Función para organizar preguntas jerárquicamente
const organizeQuestions = (questions) => {
  if (!questions || !Array.isArray(questions)) return [];

  const questionMap = new Map();
  questions.forEach((q) => questionMap.set(q.id, q));

  const rootQuestions = [];
  const childQuestions = new Map();

  // Separar preguntas raíz de las condicionales
  questions.forEach((question) => {
    if (question.showCondition?.parentQuestionId) {
      const parentId = question.showCondition.parentQuestionId;
      if (!childQuestions.has(parentId)) {
        childQuestions.set(parentId, []);
      }
      childQuestions.get(parentId).push(question);
    } else {
      rootQuestions.push(question);
    }
  });

  // Construir lista ordenada con numeración
  const orderedQuestions = [];
  let questionNumber = 1;

  const processQuestion = (
    question,
    number,
    isChild = false,
    parentOption = null
  ) => {
    const processedQuestion = {
      ...question,
      displayNumber: number,
      isConditional: isChild,
      parentOption,
    };

    orderedQuestions.push(processedQuestion);

    // Procesar preguntas hijas
    const children = childQuestions.get(question.id) || [];
    children.forEach((child, index) => {
      const childNumber = `${number}.${index + 1}`;
      const parentOption = question.options?.find(
        (opt) => opt.id === child.showCondition?.requiredValue
      );
      processQuestion(
        child,
        childNumber,
        true,
        parentOption?.text || child.showCondition?.requiredValue
      );
    });
  };

  // Procesar todas las preguntas raíz
  rootQuestions.forEach((question) => {
    processQuestion(question, questionNumber.toString());
    questionNumber++;
  });

  return orderedQuestions;
};

// Función para encontrar preguntas que dependen de una opción específica
const findDependentQuestions = (question, allQuestions) => {
  if (!question.options || !allQuestions) return [];

  return allQuestions
    .filter((q) => q.showCondition?.parentQuestionId === question.id)
    .map((dependentQ) => {
      const parentOption = question.options.find(
        (opt) => opt.id === dependentQ.showCondition.requiredValue
      );
      return {
        question: dependentQ,
        option: parentOption?.text || dependentQ.showCondition?.requiredValue,
        optionId: dependentQ.showCondition?.requiredValue,
      };
    });
};

const SurveyPDF = ({ surveyData }) => {
  const basicInfo = surveyData?.basicInfo || {};
  const questions = organizeQuestions(surveyData?.questions || []);
  const participants = surveyData?.participants || {};
  const today = new Date().toLocaleDateString("es-ES");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            src={`data:image/png;base64,${LOGO_BASE64}`}
            style={styles.logo}
          />
          <Text style={styles.headerDate}>Generado el {today}</Text>
        </View>

        {/* Título y descripción */}
        <Text style={styles.title}>
          {basicInfo.title || "Encuesta Sin Título"}
        </Text>
        {basicInfo.description && (
          <Text style={styles.description}>{basicInfo.description}</Text>
        )}

        {/* Información básica */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Información General</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha de Inicio:</Text>
              <Text style={styles.infoValue}>
                {basicInfo.startDate
                  ? new Date(basicInfo.startDate).toLocaleDateString("es-ES")
                  : "No definida"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha de Fin:</Text>
              <Text style={styles.infoValue}>
                {basicInfo.endDate
                  ? new Date(basicInfo.endDate).toLocaleDateString("es-ES")
                  : "No definida"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Meta de Respuestas:</Text>
              <Text style={styles.infoValue}>
                {basicInfo.target || 0} respuestas
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Encuestadores:</Text>
              <Text style={styles.infoValue}>
                {participants.userIds?.length || 0} asignados
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Supervisores:</Text>
              <Text style={styles.infoValue}>
                {participants.supervisorsIds?.length || 0} asignados
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total de Preguntas:</Text>
              <Text style={styles.infoValue}>{questions.length} preguntas</Text>
            </View>
          </View>
        </View>

        {/* Título de preguntas */}
        <Text style={styles.questionsTitle}>Preguntas de la Encuesta</Text>

        {/* Lista de preguntas */}
        {questions.map((question, index) => {
          const dependentQuestions = findDependentQuestions(
            question,
            surveyData?.questions || []
          );

          return (
            <View key={question.id || index} style={styles.questionContainer}>
              {/* Header de la pregunta */}
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>
                  {question.displayNumber}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questionTitle}>
                    {question.title}
                    {question.required && (
                      <Text style={styles.questionRequired}> *</Text>
                    )}
                  </Text>
                </View>
              </View>

              {/* Tipo de pregunta */}
              <View style={styles.questionMeta}>
                <Text style={styles.questionType}>
                  {QUESTION_TYPES_ES[question.type] || question.type}
                </Text>
              </View>

              {/* Descripción */}
              {question.description && (
                <Text style={styles.questionDescription}>
                  {question.description}
                </Text>
              )}

              {/* Indicador de pregunta condicional */}
              {question.isConditional && question.parentOption && (
                <View style={styles.conditionalBadge}>
                  <Text style={styles.conditionalTitle}>
                    PREGUNTA CONDICIONAL
                  </Text>
                  <Text style={styles.conditionalText}>
                    Se muestra solo si se selecciona: "{question.parentOption}"
                  </Text>
                </View>
              )}

              {/* Opciones de respuesta */}
              {question.options && question.options.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.optionsTitle}>
                    Opciones de Respuesta:
                  </Text>
                  {question.options.map((option, optIndex) => {
                    const optionText =
                      typeof option === "string"
                        ? option
                        : option.text || option.value;
                    const hasConditional = dependentQuestions.some(
                      (dep) =>
                        dep.optionId ===
                        (typeof option === "string" ? option : option.id)
                    );

                    return (
                      <View key={optIndex} style={styles.optionItem}>
                        <View style={styles.optionBullet} />
                        <Text style={styles.optionText}>{optionText}</Text>
                        {hasConditional && (
                          <Text style={styles.optionConditional}>
                            → Condicional
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Matriz - Filas */}
              {question.matrixRows && question.matrixRows.length > 0 && (
                <View style={styles.matrixContainer}>
                  <View style={styles.matrixSection}>
                    <Text style={styles.matrixLabel}>Filas:</Text>
                    {question.matrixRows.map((row, rowIndex) => (
                      <Text key={rowIndex} style={styles.matrixItem}>
                        •{" "}
                        {typeof row === "string" ? row : row.text || row.value}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Matriz - Columnas */}
              {question.matrixColumns && question.matrixColumns.length > 0 && (
                <View style={styles.matrixContainer}>
                  <View style={styles.matrixSection}>
                    <Text style={styles.matrixLabel}>Columnas:</Text>
                    {question.matrixColumns.map((col, colIndex) => (
                      <Text key={colIndex} style={styles.matrixItem}>
                        •{" "}
                        {typeof col === "string" ? col : col.text || col.value}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Preguntas dependientes */}
              {dependentQuestions.length > 0 && (
                <View style={styles.relatedQuestionsContainer}>
                  <Text style={styles.relatedTitle}>
                    Esta pregunta controla la visualización de:
                  </Text>
                  {dependentQuestions.map((dep, depIndex) => (
                    <Text key={depIndex} style={styles.relatedItem}>
                      • Pregunta "{dep.question.title}" (cuando se selecciona: "
                      {dep.option}")
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{basicInfo.title || "Encuesta"}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default SurveyPDF;
