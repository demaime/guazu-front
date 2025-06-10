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
    width: 50,
    height: 50,
    // Ajusta estas dimensiones según tu logo:
    // width: 150,  // más ancho
    // height: 45,  // más alto
    // Si tu logo no se ve, prueba con dimensiones más grandes como:
    // width: 120, height: 60
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
