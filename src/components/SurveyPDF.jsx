"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Logo en base64 para carga directa
const LOGO_BASE64 =
  "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";

// Create styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: "1px solid #E0E0E0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 120,
    marginRight: 10,
  },
  headerTitle: {
    color: "#1F2937",
    fontSize: 10,
  },
  documentTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1E40AF",
  },
  description: {
    fontSize: 12,
    marginBottom: 20,
    color: "#4B5563",
  },
  infoSection: {
    marginBottom: 25,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 5,
    borderLeft: "4px solid #3B82F6",
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoContainer: {
    width: "31%",
    marginRight: "2%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 3,
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 11,
    color: "#1F2937",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 15,
    color: "#1F2937",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 4,
  },
  legendContainer: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
    border: "1px solid #E5E7EB",
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendIcon: {
    width: 20,
    height: 8,
    backgroundColor: "#FEFEFE",
    marginRight: 8,
    borderRadius: 2,
    border: "1px solid #D1D5DB",
  },
  legendText: {
    fontSize: 9,
    color: "#4B5563",
  },
  questionContainer: {
    marginBottom: 20,
    borderBottom: "1px solid #E5E7EB",
    paddingBottom: 15,
    backgroundColor: "#FEFEFE",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #F3F4F6",
  },
  questionHeader: {
    flexDirection: "row",
    marginBottom: 7,
  },
  questionNumber: {
    backgroundColor: "#3B82F6",
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    padding: 4,
    borderRadius: 4,
    marginRight: 8,
    textAlign: "center",
    minWidth: 25,
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    flex: 1,
    color: "#1F2937",
  },
  obligatoryTag: {
    fontSize: 9,
    color: "#EF4444",
    borderRadius: 2,
    marginLeft: 5,
  },
  questionMeta: {
    marginLeft: 33,
    marginBottom: 6,
  },
  questionType: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 4,
    backgroundColor: "#F3F4F6",
    padding: "2 5",
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  questionDescription: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 8,
    marginLeft: 33,
  },
  dependencyInfo: {
    fontSize: 10,
    color: "#2563EB",
    marginBottom: 8,
    marginLeft: 33,
    fontStyle: "italic",
  },
  optionsContainer: {
    marginLeft: 33,
    marginTop: 4,
  },
  optionLabel: {
    fontSize: 10,
    color: "#4B5563",
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  optionMarker: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
    marginRight: 6,
  },
  conditionalMarker: {
    color: "#2563EB",
    fontSize: 9,
    fontWeight: "bold",
    marginLeft: 4,
  },
  conditionalContainer: {
    backgroundColor: "#FEF3C7",
    padding: 8,
    marginLeft: 33,
    marginBottom: 8,
    borderLeft: "3px solid #F59E0B",
    borderRadius: 3,
  },
  conditionalTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#92400E",
    marginBottom: 3,
  },
  childQuestionsContainer: {
    backgroundColor: "#DBEAFE",
    padding: 8,
    marginLeft: 33,
    marginTop: 8,
    borderLeft: "3px solid #3B82F6",
    borderRadius: 3,
  },
  childQuestionsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1E40AF",
    marginBottom: 6,
  },
  childQuestionRow: {
    marginBottom: 4,
  },
  childQuestionText: {
    fontSize: 9,
    color: "#1E40AF",
    fontWeight: "bold",
  },
  childQuestionCondition: {
    fontSize: 8,
    color: "#3730A3",
    fontStyle: "italic",
    marginTop: 2,
    paddingLeft: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 9,
    color: "#9CA3AF",
    borderTop: "1px solid #E5E7EB",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageNumber: {
    fontSize: 9,
    color: "#9CA3AF",
  },
});

// Función para traducir el tipo de pregunta a español
const translateQuestionType = (type) => {
  const types = {
    text: "Texto",
    radiogroup: "Opción Única",
    checkbox: "Selección Múltiple",
    dropdown: "Lista Desplegable",
    rating: "Calificación",
    boolean: "Sí/No",
    comment: "Comentario",
    expression: "Expresión",
    html: "HTML",
    matrix: "Matriz",
    matrixdropdown: "Matriz Desplegable",
    matrixdynamic: "Matriz Dinámica",
    multipletext: "Múltiples Textos",
    panel: "Panel",
    paneldynamic: "Panel Dinámico",
    file: "Archivo",
  };
  return types[type] || type;
};

// Función para buscar información de dependencias (preguntas que dependen de esta) - Compatible con ambos formatos
const findDependencies = (question, allQuestions) => {
  const dependencies = [];

  if (!allQuestions || !Array.isArray(allQuestions) || !question)
    return dependencies;

  allQuestions.forEach((q) => {
    // Si esta pregunta tiene showCondition que referencia a la pregunta actual
    if (q.showCondition && q.showCondition.parentQuestionId === question.id) {
      // Buscar el texto de la opción requerida
      const requiredOption = question.options?.find(
        (opt) => opt.id === q.showCondition.requiredValue
      );
      const optionText =
        requiredOption?.text ||
        q.showCondition.requiredValue ||
        "Valor desconocido";

      dependencies.push({
        id: q.id,
        title: q.title,
        fromOption: optionText,
        questionNumber: allQuestions.findIndex((qq) => qq.id === q.id) + 1,
      });
    }
  });

  return dependencies;
};

// Función para buscar información sobre el padre de una pregunta
const findParentInfo = (question, allQuestions, surveyData) => {
  if (!allQuestions || !Array.isArray(allQuestions) || !question) return null;

  // Verificar si la pregunta tiene showCondition
  if (question.showCondition && question.showCondition.parentQuestionId) {
    const parentQuestion = allQuestions.find(
      (q) => q.id === question.showCondition.parentQuestionId
    );
    if (parentQuestion) {
      // Buscar el texto de la opción requerida
      const requiredOption = parentQuestion.options?.find(
        (opt) => opt.id === question.showCondition.requiredValue
      );
      const optionText =
        requiredOption?.text ||
        question.showCondition.requiredValue ||
        "Valor desconocido";

      // Obtener número de pregunta padre
      const parentIndex = allQuestions.findIndex(
        (item) => item.id === parentQuestion.id
      );
      const displayNumber =
        parentQuestion.displayNumber ||
        (surveyData?.questionNumberMap &&
          surveyData.questionNumberMap[parentQuestion.id]) ||
        `${parentIndex + 1}`;

      return {
        id: parentQuestion.id,
        title: parentQuestion.title,
        option: optionText,
        number: displayNumber,
      };
    }
  }

  return null;
};

const SurveyPDF = ({ surveyData }) => {
  const basicInfo = surveyData.basicInfo || {};
  const questions = surveyData.questions || [];
  const today = new Date().toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              src={`data:image/png;base64,${LOGO_BASE64}`}
              style={styles.logo}
            />
          </View>
          <Text style={styles.headerTitle}>Generado el {today}</Text>
        </View>

        <Text style={styles.documentTitle}>
          {basicInfo.title || "Sin título"}
        </Text>
        <Text style={styles.description}>
          {basicInfo.description || "Sin descripción"}
        </Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Periodo de la encuesta</Text>
              <Text style={styles.infoValue}>
                {basicInfo.startDate
                  ? new Date(basicInfo.startDate).toLocaleDateString()
                  : "N/A"}{" "}
                -{" "}
                {basicInfo.endDate
                  ? new Date(basicInfo.endDate).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Meta de respuestas</Text>
              <Text style={styles.infoValue}>
                {basicInfo.target || 0} respuestas
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Participantes</Text>
              <Text style={styles.infoValue}>
                {surveyData.participants?.userIds?.length || 0} encuestadores
                {surveyData.participants?.supervisorsIds?.length > 0
                  ? `, ${surveyData.participants.supervisorsIds.length} supervisores`
                  : ""}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Preguntas de la encuesta</Text>

        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Leyenda:</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendIcon} />
            <Text style={styles.legendText}>
              Pregunta normal (se muestra siempre)
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[
                styles.legendIcon,
                { backgroundColor: "#FEF3C7", borderLeft: "3px solid #F59E0B" },
              ]}
            />
            <Text style={styles.legendText}>
              Pregunta condicional (se muestra solo si se cumple una condición)
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[
                styles.legendIcon,
                { backgroundColor: "#DBEAFE", borderLeft: "3px solid #3B82F6" },
              ]}
            />
            <Text style={styles.legendText}>
              Esta pregunta controla la visualización de otras preguntas
            </Text>
          </View>
        </View>

        {questions.map((question, index) => {
          // Buscar información sobre el padre de esta pregunta (si existe)
          const parentInfo = findParentInfo(question, questions, surveyData);
          // Buscar información sobre las preguntas que dependen de esta
          const childQuestions = findDependencies(question, questions);

          const displayNumber =
            question.displayNumber ||
            (surveyData.questionNumberMap &&
              surveyData.questionNumberMap[question.id]) ||
            `${index + 1}`;

          return (
            <View key={index} style={styles.questionContainer}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>{displayNumber}</Text>
                <Text style={styles.questionTitle}>
                  {question.title}
                  {question.required && (
                    <Text style={styles.obligatoryTag}> *Obligatoria</Text>
                  )}
                </Text>
              </View>

              <View style={styles.questionMeta}>
                <Text style={styles.questionType}>
                  {translateQuestionType(question.type)}
                </Text>
              </View>

              {question.description && (
                <Text style={styles.questionDescription}>
                  {question.description}
                </Text>
              )}

              {parentInfo && (
                <View style={styles.conditionalContainer}>
                  <Text style={styles.conditionalTitle}>
                    PREGUNTA CONDICIONAL
                  </Text>
                  <Text style={styles.dependencyInfo}>
                    ↳ Solo se muestra si en la pregunta{" "}
                    {parentInfo.number || "?"} se selecciona: "
                    {parentInfo.option}"
                  </Text>
                </View>
              )}

              {question.options && question.options.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { fontWeight: "bold", marginBottom: 6 },
                    ]}
                  >
                    Opciones:
                  </Text>
                  {question.options.map((option, optIndex) => {
                    // Determinar si esta opción lleva a otra pregunta
                    const leadsTo =
                      typeof option === "object" && option.nextQuestionId
                        ? questions.find((q) => q.id === option.nextQuestionId)
                        : null;

                    const optionText =
                      typeof option === "string"
                        ? option
                        : option.text || option.value || "Opción sin texto";

                    return (
                      <View key={optIndex} style={styles.optionRow}>
                        <View style={styles.optionMarker} />
                        <Text style={styles.optionLabel}>
                          {optionText}
                          {leadsTo && (
                            <Text style={styles.conditionalMarker}>
                              {` → P${leadsTo.displayNumber || "?"}`}
                            </Text>
                          )}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {question.rows && question.rows.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { fontWeight: "bold", marginBottom: 6 },
                    ]}
                  >
                    Filas:
                  </Text>
                  {question.rows.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.optionRow}>
                      <View style={styles.optionMarker} />
                      <Text style={styles.optionLabel}>
                        {typeof row === "string"
                          ? row
                          : row.text || row.value || "Fila sin texto"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {question.columns && question.columns.length > 0 && (
                <View style={styles.optionsContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { fontWeight: "bold", marginBottom: 6 },
                    ]}
                  >
                    Columnas:
                  </Text>
                  {question.columns.map((col, colIndex) => (
                    <View key={colIndex} style={styles.optionRow}>
                      <View style={styles.optionMarker} />
                      <Text style={styles.optionLabel}>
                        {typeof col === "string"
                          ? col
                          : col.text || col.value || "Columna sin texto"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {childQuestions.length > 0 && (
                <View style={styles.childQuestionsContainer}>
                  <Text style={styles.childQuestionsTitle}>
                    🔗 CONTROLA LA VISUALIZACIÓN DE:
                  </Text>
                  {childQuestions.map((childQ, childIndex) => (
                    <View key={childIndex} style={styles.childQuestionRow}>
                      <Text style={styles.childQuestionText}>
                        → Pregunta {childQ.questionNumber}: "{childQ.title}"
                      </Text>
                      <Text style={styles.childQuestionCondition}>
                        (aparece cuando se selecciona: "{childQ.fromOption}")
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>{basicInfo.title || "Encuesta"}</Text>
          <Text
            style={styles.pageNumber}
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
